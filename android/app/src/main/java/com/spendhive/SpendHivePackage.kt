package com.spendhive

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.spendhive.security.SecureStoreModule
import com.spendhive.system.SystemInfoModule

/** The app's own native modules (system metrics, secure storage / device auth). */
class SpendHivePackage : BaseReactPackage() {

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      when (name) {
        SystemInfoModule.NAME -> SystemInfoModule(reactContext)
        SecureStoreModule.NAME -> SecureStoreModule(reactContext)
        else -> null
      }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    listOf(SystemInfoModule.NAME to SystemInfoModule::class.java, SecureStoreModule.NAME to SecureStoreModule::class.java)
        .associate { (name, cls) -> name to ReactModuleInfo(name, cls.name, false, false, false, false) }
  }
}
