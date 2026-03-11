package com.iamhuman.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.iamhuman.app.data.api.TrustFabricApi
import com.iamhuman.app.data.models.ActionExecuteResponse
import com.iamhuman.app.data.models.ActionRequest
import com.iamhuman.app.data.models.ActionRequestCapability
import com.iamhuman.app.data.models.ActionRequestContext
import com.iamhuman.app.data.models.ActionRequestDevice
import com.iamhuman.app.data.models.ActionRequestIdentity
import com.iamhuman.app.data.models.ActionRequestIntent
import com.iamhuman.app.data.models.ActionRequestLegitimacy
import kotlinx.coroutines.launch

@Composable
fun ExecuteActionScreen(
    trustFabricApi: TrustFabricApi,
    onResult: (ActionExecuteResponse, ActionUiState) -> Unit,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var uiState by remember { mutableStateOf(ActionUiState.IDLE) }
    var message by remember { mutableStateOf("") }

    var deviceId by remember { mutableStateOf("android-client") }
    var publicKey by remember { mutableStateOf("") }
    var fingerprint by remember { mutableStateOf("") }

    var actorId by remember { mutableStateOf("mobile-user") }
    var actorType by remember { mutableStateOf("user") }
    var sessionId by remember { mutableStateOf("") }

    var actionType by remember { mutableStateOf("AUTH_CHALLENGE") }

    var authMethod by remember { mutableStateOf("jwt") }
    var trustLevel by remember { mutableStateOf("medium") }

    var route by remember { mutableStateOf("/mobile/execute") }
    var requestId by remember { mutableStateOf("") }
    var userAgent by remember { mutableStateOf("android-thin-client") }
    var ipAddress by remember { mutableStateOf("") }

    var permissionsCsv by remember { mutableStateOf("auth:challenge") }
    var constraintsVersion by remember { mutableStateOf("1.0.0") }

    val background = Brush.linearGradient(
        colors = listOf(Color(0xFF050608), Color(0xFF0B0D10), Color(0xFF020202))
    )

    fun toRequest(): ActionRequest {
        val permissions = permissionsCsv
            .split(',')
            .map { it.trim() }
            .filter { it.isNotEmpty() }

        return ActionRequest(
            device = ActionRequestDevice(
                deviceId = deviceId.trim(),
                publicKey = publicKey.trim().ifEmpty { null },
                fingerprint = fingerprint.trim().ifEmpty { null },
            ),
            identity = ActionRequestIdentity(
                actorId = actorId.trim(),
                actorType = actorType.trim(),
                sessionId = sessionId.trim().ifEmpty { null },
            ),
            intent = ActionRequestIntent(actionType = actionType.trim()),
            legitimacy = ActionRequestLegitimacy(
                authMethod = authMethod.trim(),
                trustLevel = trustLevel.trim(),
            ),
            context = ActionRequestContext(
                route = route.trim(),
                requestId = requestId.trim().ifEmpty { null },
                userAgent = userAgent.trim().ifEmpty { null },
                ipAddress = ipAddress.trim().ifEmpty { null },
            ),
            capability = ActionRequestCapability(
                permissions = permissions,
                constraintsVersion = constraintsVersion.trim(),
            ),
            payload = emptyMap(),
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(background)
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text = "Execute Action",
            color = Color(0xFFECEEF1),
            fontWeight = FontWeight.SemiBold,
        )

        Text(
            text = "Collect primitives and submit to /actions/execute. Device does not decide trust.",
            color = Color(0xFF97A0AA),
        )

        ActionField(label = "Device ID", value = deviceId, onValueChange = { deviceId = it })
        ActionField(label = "Public Key (optional)", value = publicKey, onValueChange = { publicKey = it })
        ActionField(label = "Fingerprint (optional)", value = fingerprint, onValueChange = { fingerprint = it })

        ActionField(label = "Actor ID", value = actorId, onValueChange = { actorId = it })
        ActionField(label = "Actor Type", value = actorType, onValueChange = { actorType = it })
        ActionField(label = "Session ID (optional)", value = sessionId, onValueChange = { sessionId = it })

        ActionField(label = "Intent / Action Type", value = actionType, onValueChange = { actionType = it })
        ActionField(label = "Auth Method", value = authMethod, onValueChange = { authMethod = it })
        ActionField(label = "Trust Level", value = trustLevel, onValueChange = { trustLevel = it })

        ActionField(label = "Context Route", value = route, onValueChange = { route = it })
        ActionField(label = "Request ID (optional)", value = requestId, onValueChange = { requestId = it })
        ActionField(label = "User Agent (optional)", value = userAgent, onValueChange = { userAgent = it })
        ActionField(label = "IP Address (optional)", value = ipAddress, onValueChange = { ipAddress = it })

        ActionField(
            label = "Capabilities (comma-separated)",
            value = permissionsCsv,
            onValueChange = { permissionsCsv = it }
        )
        ActionField(
            label = "Constraints Version",
            value = constraintsVersion,
            onValueChange = { constraintsVersion = it }
        )

        when (uiState) {
            ActionUiState.LOADING -> {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    CircularProgressIndicator(color = Color(0xFFC5CDD5), modifier = Modifier.padding(top = 4.dp))
                    Text("Submitting action…", color = Color(0xFF97A0AA))
                }
            }

            ActionUiState.NETWORK_ERROR -> Text(message, color = Color(0xFFDB4F5F))
            else -> if (message.isNotBlank()) {
                Text(message, color = Color(0xFF97A0AA))
            }
        }

        Button(
            onClick = {
                scope.launch {
                    uiState = ActionUiState.LOADING
                    message = ""

                    try {
                        val response = trustFabricApi.executeAction(toRequest())
                        val responseState = if (response.status == "pass") {
                            ActionUiState.PASS
                        } else {
                            ActionUiState.FAIL
                        }
                        uiState = responseState
                        onResult(response, responseState)
                    } catch (error: Exception) {
                        uiState = ActionUiState.NETWORK_ERROR
                        val reason = error.message ?: "Network error"
                        message = "Fail closed: $reason"
                        onResult(
                            ActionExecuteResponse(
                                status = "fail",
                                polarity = "-",
                                eventHash = "unavailable",
                                reason = "Fail closed on network/API error: $reason",
                            ),
                            ActionUiState.NETWORK_ERROR,
                        )
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
            enabled = uiState != ActionUiState.LOADING,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF1B2026),
                contentColor = Color(0xFFF4F6F8),
            ),
        ) {
            Text("Submit Action")
        }

        Button(
            onClick = onBack,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF13171C),
                contentColor = Color(0xFFBFC6CD),
            ),
        ) {
            Text("Back")
        }
    }
}

@Composable
private fun ActionField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
    )
}
