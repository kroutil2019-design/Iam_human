package com.iamhuman.app.navigation

import android.net.Uri

sealed class Screen(val route: String) {
    object TrustHome : Screen("trust_home")
    object ExecuteAction : Screen("execute_action")
    object ActionIndex : Screen("action_index")
    object ActionResult : Screen("action_result")

    object Splash : Screen("splash")
    object Onboarding : Screen("onboarding")
    object EmailEntry : Screen("email_entry")
    object OtpVerify : Screen("otp_verify/{email}") {
        fun createRoute(email: String): String {
            val encodedEmail = Uri.encode(email)
            return "otp_verify/$encodedEmail"
        }
    }
    object VerifyDevice : Screen("verify_device")
    object Proof : Screen("proof")
    object Settings : Screen("settings")
}
