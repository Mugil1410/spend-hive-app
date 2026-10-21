package com.spendhive.system

import android.app.ActivityManager
import android.app.usage.StorageStatsManager
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.TrafficStats
import android.os.Build
import android.os.Debug
import android.os.Environment
import android.os.Process
import android.os.StatFs
import android.os.SystemClock
import android.os.storage.StorageManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import java.io.File

/**
 * Live device metrics for the System Analytics screen. Everything comes from public Android APIs an
 * ordinary app may call without special permissions; a metric Android hides from apps is reported
 * as null rather than estimated.
 */
class SystemInfoModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  // Previous samples, so CPU usage can be computed as a delta between polls.
  private var lastProcStat: LongArray? = null
  private var lastAppCpuMs: Long = 0
  private var lastAppWallMs: Long = 0

  @ReactMethod
  fun getMemoryInfo(promise: Promise) {
    try {
      val am = reactContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      val info = ActivityManager.MemoryInfo()
      am.getMemoryInfo(info)
      val appMem = Debug.MemoryInfo()
      Debug.getMemoryInfo(appMem)
      val map = Arguments.createMap()
      map.putDouble("total", info.totalMem.toDouble())
      map.putDouble("available", info.availMem.toDouble())
      map.putDouble("threshold", info.threshold.toDouble())
      map.putBoolean("lowMemory", info.lowMemory)
      map.putDouble("appUsed", appMem.totalPss * 1024.0)
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("E_MEMORY", e.message, e)
    }
  }

  @ReactMethod
  fun getCpuInfo(promise: Promise) {
    try {
      val cores = Runtime.getRuntime().availableProcessors()
      val map = Arguments.createMap()
      map.putInt("cores", cores)
      map.putString("hardware", readHardwareName())
      map.putString("abi", Build.SUPPORTED_ABIS.firstOrNull())

      // Device-wide usage needs /proc/stat, which Android 8+ blocks for apps; null when unreadable.
      val stat = readProcStat()
      val prev = lastProcStat
      if (stat != null && prev != null) {
        val idle = stat[1] - prev[1]
        val total = stat[0] - prev[0]
        if (total > 0) map.putDouble("deviceUsage", ((total - idle) * 100.0 / total).coerceIn(0.0, 100.0))
        else map.putNull("deviceUsage")
      } else {
        map.putNull("deviceUsage")
      }
      lastProcStat = stat

      // This app's own share of total CPU capacity since the previous poll.
      val cpuMs = Process.getElapsedCpuTime()
      val wallMs = SystemClock.elapsedRealtime()
      if (lastAppWallMs > 0 && wallMs > lastAppWallMs) {
        val pct = (cpuMs - lastAppCpuMs) * 100.0 / ((wallMs - lastAppWallMs) * cores)
        map.putDouble("appUsage", pct.coerceIn(0.0, 100.0))
      } else {
        map.putNull("appUsage")
      }
      lastAppCpuMs = cpuMs
      lastAppWallMs = wallMs

      val freqs = Arguments.createArray()
      for (i in 0 until cores) {
        val cur = readLong("/sys/devices/system/cpu/cpu$i/cpufreq/scaling_cur_freq")
        val max = readLong("/sys/devices/system/cpu/cpu$i/cpufreq/cpuinfo_max_freq")
        val core = Arguments.createMap()
        if (cur != null) core.putDouble("currentKHz", cur.toDouble()) else core.putNull("currentKHz")
        if (max != null) core.putDouble("maxKHz", max.toDouble()) else core.putNull("maxKHz")
        freqs.pushMap(core)
      }
      map.putArray("coreFrequencies", freqs)
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("E_CPU", e.message, e)
    }
  }

  @ReactMethod
  fun getStorageInfo(promise: Promise) {
    try {
      val stat = StatFs(Environment.getDataDirectory().path)
      val map = Arguments.createMap()
      map.putDouble("total", stat.totalBytes.toDouble())
      map.putDouble("available", stat.availableBytes.toDouble())

      var appBytes: Long? = null
      var dataBytes: Long? = null
      var cacheBytes: Long? = null
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        try {
          // Querying our own package needs no permission.
          val ssm = reactContext.getSystemService(Context.STORAGE_STATS_SERVICE) as StorageStatsManager
          val stats = ssm.queryStatsForPackage(
              StorageManager.UUID_DEFAULT, reactContext.packageName, Process.myUserHandle())
          appBytes = stats.appBytes
          dataBytes = stats.dataBytes
          cacheBytes = stats.cacheBytes
        } catch (_: Exception) {
          // Some OEM builds refuse this; fall back to measuring our own directories below.
        }
      }
      if (dataBytes == null) {
        dataBytes = dirSize(reactContext.dataDir)
        cacheBytes = dirSize(reactContext.cacheDir) + (reactContext.externalCacheDir?.let { dirSize(it) } ?: 0)
        appBytes = File(reactContext.applicationInfo.sourceDir).length()
      }
      map.putDouble("appCode", appBytes!!.toDouble())
      map.putDouble("appData", dataBytes.toDouble())
      map.putDouble("appCache", (cacheBytes ?: 0L).toDouble())
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("E_STORAGE", e.message, e)
    }
  }

  @ReactMethod
  fun getNetworkInfo(promise: Promise) {
    try {
      val map = Arguments.createMap()
      val mobileRx = TrafficStats.getMobileRxBytes()
      val mobileTx = TrafficStats.getMobileTxBytes()
      val totalRx = TrafficStats.getTotalRxBytes()
      val totalTx = TrafficStats.getTotalTxBytes()
      putBytes(map, "mobileRx", mobileRx)
      putBytes(map, "mobileTx", mobileTx)
      putBytes(map, "totalRx", totalRx)
      putBytes(map, "totalTx", totalTx)
      // TrafficStats has no Wi-Fi counter; everything that isn't mobile is Wi-Fi/Ethernet/other.
      putBytes(map, "otherRx", if (totalRx >= 0 && mobileRx >= 0) totalRx - mobileRx else -1)
      putBytes(map, "otherTx", if (totalTx >= 0 && mobileTx >= 0) totalTx - mobileTx else -1)
      putBytes(map, "appRx", TrafficStats.getUidRxBytes(Process.myUid()))
      putBytes(map, "appTx", TrafficStats.getUidTxBytes(Process.myUid()))
      map.putDouble("since", (System.currentTimeMillis() - SystemClock.elapsedRealtime()).toDouble())

      val cm = reactContext.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
      val caps = cm.activeNetwork?.let { cm.getNetworkCapabilities(it) }
      val type = when {
        caps == null -> "none"
        caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
        caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
        caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
        caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN) -> "vpn"
        caps.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH) -> "bluetooth"
        else -> "other"
      }
      map.putString("type", type)
      map.putBoolean("connected", caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true)
      map.putBoolean("validated", caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true)
      map.putBoolean("metered", cm.isActiveNetworkMetered)
      if (caps != null) {
        map.putDouble("downKbps", caps.linkDownstreamBandwidthKbps.toDouble())
        map.putDouble("upKbps", caps.linkUpstreamBandwidthKbps.toDouble())
      }
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("E_NETWORK", e.message, e)
    }
  }

  private fun putBytes(map: WritableMap, key: String, value: Long) {
    if (value == TrafficStats.UNSUPPORTED.toLong() || value < 0) map.putNull(key) else map.putDouble(key, value.toDouble())
  }

  /** Returns [total, idle] jiffies, or null when /proc/stat is not readable. */
  private fun readProcStat(): LongArray? =
      try {
        val parts = File("/proc/stat").bufferedReader().use { it.readLine() }
            .trim().split(Regex("\\s+")).drop(1).map { it.toLong() }
        val idle = parts[3] + parts.getOrElse(4) { 0 }
        longArrayOf(parts.sum(), idle)
      } catch (_: Exception) {
        null
      }

  private fun readHardwareName(): String? {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val soc = listOf(Build.SOC_MANUFACTURER, Build.SOC_MODEL).filter { it != Build.UNKNOWN }
      if (soc.isNotEmpty()) return soc.joinToString(" ")
    }
    try {
      File("/proc/cpuinfo").useLines { lines ->
        lines.firstOrNull { it.startsWith("Hardware") }?.substringAfter(':')?.trim()?.let { return it }
      }
    } catch (_: Exception) {
    }
    return Build.HARDWARE
  }

  private fun readLong(path: String): Long? =
      try {
        File(path).readText().trim().toLong()
      } catch (_: Exception) {
        null
      }

  private fun dirSize(dir: File): Long = dir.walkTopDown().filter { it.isFile }.sumOf { it.length() }

  companion object {
    const val NAME = "SpendHiveSystemInfo"
  }
}
