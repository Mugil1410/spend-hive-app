package com.spendhive.security

import android.app.KeyguardManager
import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Small Android Keystore-backed key/value store (AES-256-GCM; the key never leaves the Keystore),
 * plus the system biometric / device-credential prompt used by App Lock.
 */
class SecureStoreModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  private val prefs by lazy { reactContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE) }

  @ReactMethod
  fun setItem(key: String, value: String, promise: Promise) {
    try {
      val cipher = Cipher.getInstance(TRANSFORMATION)
      cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
      val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
      val packed = cipher.iv + encrypted
      prefs.edit().putString(key, Base64.encodeToString(packed, Base64.NO_WRAP)).apply()
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("E_SECURE_WRITE", e.message, e)
    }
  }

  @ReactMethod
  fun getItem(key: String, promise: Promise) {
    try {
      val stored = prefs.getString(key, null) ?: return promise.resolve(null)
      val packed = Base64.decode(stored, Base64.NO_WRAP)
      val cipher = Cipher.getInstance(TRANSFORMATION)
      cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(128, packed, 0, IV_SIZE))
      val plain = cipher.doFinal(packed, IV_SIZE, packed.size - IV_SIZE)
      promise.resolve(String(plain, Charsets.UTF_8))
    } catch (e: Exception) {
      promise.reject("E_SECURE_READ", e.message, e)
    }
  }

  @ReactMethod
  fun deleteItem(key: String, promise: Promise) {
    prefs.edit().remove(key).apply()
    promise.resolve(null)
  }

  /** What the device offers: enrolled biometrics and/or a secure screen lock. */
  @ReactMethod
  fun getDeviceAuthStatus(promise: Promise) {
    val bm = BiometricManager.from(reactContext)
    val keyguard = reactContext.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    val map = Arguments.createMap()
    map.putBoolean("biometricEnrolled", bm.canAuthenticate(BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS)
    map.putBoolean("deviceSecure", keyguard.isDeviceSecure)
    map.putBoolean(
        "available", bm.canAuthenticate(BIOMETRIC_WEAK or DEVICE_CREDENTIAL) == BiometricManager.BIOMETRIC_SUCCESS)
    promise.resolve(map)
  }

  /** Shows the system prompt (fingerprint / face, or the device PIN/pattern/password). Resolves true on success. */
  @ReactMethod
  fun authenticate(title: String, subtitle: String, promise: Promise) {
    val activity = reactContext.currentActivity as? FragmentActivity
        ?: return promise.reject("E_NO_ACTIVITY", "No foreground activity")
    UiThreadUtil.runOnUiThread {
      var settled = false
      val callback = object : BiometricPrompt.AuthenticationCallback() {
        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
          if (!settled) { settled = true; promise.resolve(true) }
        }

        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
          if (!settled) { settled = true; promise.resolve(false) }
        }
        // onAuthenticationFailed (one bad finger) keeps the prompt open, so nothing to do.
      }
      try {
        val prompt = BiometricPrompt(activity, ContextCompat.getMainExecutor(activity), callback)
        val info = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setAllowedAuthenticators(BIOMETRIC_WEAK or DEVICE_CREDENTIAL)
            .build()
        prompt.authenticate(info)
      } catch (e: Exception) {
        if (!settled) { settled = true; promise.reject("E_AUTH", e.message, e) }
      }
    }
  }

  private fun getOrCreateKey(): SecretKey {
    val ks = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
    (ks.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
    generator.init(
        KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build())
    return generator.generateKey()
  }

  companion object {
    const val NAME = "SpendHiveSecureStore"
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val KEY_ALIAS = "spendhive_secure_store_key"
    private const val PREFS = "spendhive_secure_store"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val IV_SIZE = 12
  }
}
