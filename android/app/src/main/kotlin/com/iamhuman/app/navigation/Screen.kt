package com.iamhuman.app.navigation

import android.net.Uri

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Onboarding : Screen("onboarding")
    object EmailEntry : Screen("email_entry")
    object OtpVerify : Screen("otp_verify/{email}") {
        fun createRoute(email: String): String {
            val encodedEmail = Uri.encode(email)
            return "otp_verify/$encodedEmail"
        }
    }
    object Selfie : Screen("selfie")
    object Proof : Screen("proof")
    object Settings : Screen("settings")
}
