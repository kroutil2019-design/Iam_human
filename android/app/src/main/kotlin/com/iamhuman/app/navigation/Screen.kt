package com.iamhuman.app.navigation

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Onboarding : Screen("onboarding")
    object EmailEntry : Screen("email_entry")
    object OtpVerify : Screen("otp_verify/{email}") {
        fun createRoute(email: String) = "otp_verify/$email"
    }
    object Selfie : Screen("selfie")
    object Proof : Screen("proof")
    object Settings : Screen("settings")
}
