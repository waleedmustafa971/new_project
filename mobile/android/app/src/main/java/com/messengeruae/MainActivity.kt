package com.messengeruae

import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "messengeruae"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    hideSystemNavigation()
  }

  /**
   * Android puts the system navigation bar (back / home / recents) at the bottom of the
   * screen, right where the app's own bottom navigation sits. Hiding it stops the two
   * competing for the same taps.
   *
   * Re-applied on focus because Android brings the bars back after a swipe, a dialog,
   * the keyboard, or returning from another app.
   */
  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) hideSystemNavigation()
  }

  private fun hideSystemNavigation() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      // API 30+: the modern insets controller.
      window.setDecorFitsSystemWindows(false)
      window.insetsController?.let { controller ->
        controller.hide(WindowInsets.Type.navigationBars())
        // A swipe reveals the bar briefly, then it hides itself again.
        controller.systemBarsBehavior =
            WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      }
    } else {
      // API 26-29: the legacy sticky-immersive flags.
      @Suppress("DEPRECATION")
      window.decorView.systemUiVisibility = (
          View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
              or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
              or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
              or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
          )
    }
  }
}
