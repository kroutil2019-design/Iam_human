package com.iamhuman.app.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.iamhuman.app.data.api.ApiClient
import com.iamhuman.app.data.local.TokenStore
import com.iamhuman.app.ui.screens.*

@Composable
fun AppNavGraph() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val tokenStore = TokenStore(context)
    val api = ApiClient.build(tokenStore)

    val startDestination = if (tokenStore.isLoggedIn()) Screen.Proof.route else Screen.Splash.route

    NavHost(navController = navController, startDestination = startDestination) {
        composable(Screen.Splash.route) {
            SplashScreen(
                onNavigate = {
                    if (tokenStore.isLoggedIn()) {
                        navController.navigate(Screen.Proof.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    } else {
                        navController.navigate(Screen.Onboarding.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    }
                }
            )
        }

        composable(Screen.Onboarding.route) {
            OnboardingScreen(
                onGetStarted = {
                    navController.navigate(Screen.EmailEntry.route)
                }
            )
        }

        composable(Screen.EmailEntry.route) {
            EmailEntryScreen(
                api = api,
                onOtpSent = { email ->
                    navController.navigate(Screen.OtpVerify.createRoute(email))
                }
            )
        }

        composable(
            Screen.OtpVerify.route,
            arguments = listOf(navArgument("email") { type = NavType.StringType })
        ) { backStack ->
            val email = backStack.arguments?.getString("email") ?: ""
            OtpVerifyScreen(
                email = email,
                api = api,
                tokenStore = tokenStore,
                onVerified = {
                    navController.navigate(Screen.Selfie.route) {
                        popUpTo(Screen.Onboarding.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Selfie.route) {
            SelfieScreen(
                api = api,
                onDone = {
                    navController.navigate(Screen.Proof.route) {
                        popUpTo(Screen.Selfie.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Proof.route) {
            ProofScreen(
                api = api,
                onSettings = { navController.navigate(Screen.Settings.route) },
                onSelfie = { navController.navigate(Screen.Selfie.route) }
            )
        }

        composable(Screen.Settings.route) {
            SettingsScreen(
                tokenStore = tokenStore,
                api = api,
                onReVerify = {
                    navController.navigate(Screen.EmailEntry.route) {
                        popUpTo(Screen.Proof.route) { inclusive = false }
                    }
                },
                onAccountDeleted = {
                    navController.navigate(Screen.Onboarding.route) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}
