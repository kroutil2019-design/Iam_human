package com.iamhuman.app.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.iamhuman.app.data.api.ApiClient
import com.iamhuman.app.data.api.TrustFabricApi
import com.iamhuman.app.data.models.ActionExecuteResponse
import com.iamhuman.app.ui.screens.*

@Composable
fun AppNavGraph() {
    val navController = rememberNavController()
    val trustFabricApi = remember { TrustFabricApi(ApiClient.build()) }
    var latestResponse by remember { mutableStateOf<ActionExecuteResponse?>(null) }
    var latestState by remember { mutableStateOf(ActionUiState.IDLE) }

    NavHost(navController = navController, startDestination = Screen.TrustHome.route) {
        composable(Screen.TrustHome.route) {
            TrustHomeScreen(
                onExecuteAction = { navController.navigate(Screen.ExecuteAction.route) },
                onActionIndex = { navController.navigate(Screen.ActionIndex.route) },
            )
        }

        composable(Screen.ExecuteAction.route) {
            ExecuteActionScreen(
                trustFabricApi = trustFabricApi,
                onResult = { response, state ->
                    latestResponse = response
                    latestState = state
                    navController.navigate(Screen.ActionResult.route)
                },
                onBack = { navController.popBackStack() },
            )
        }

        composable(Screen.ActionResult.route) {
            ActionResultScreen(
                response = latestResponse,
                uiState = latestState,
                onBackHome = {
                    navController.navigate(Screen.TrustHome.route) {
                        popUpTo(Screen.TrustHome.route) { inclusive = true }
                    }
                },
                onExecuteAnother = {
                    navController.navigate(Screen.ExecuteAction.route) {
                        popUpTo(Screen.ExecuteAction.route) { inclusive = true }
                    }
                },
            )
        }

        composable(Screen.ActionIndex.route) {
            ActionIndexScreen(
                trustFabricApi = trustFabricApi,
                onBack = { navController.popBackStack() },
            )
        }
    }
}
