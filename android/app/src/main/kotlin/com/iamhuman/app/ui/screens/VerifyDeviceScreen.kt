package com.iamhuman.app.ui.screens

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.iamhuman.app.data.api.ApiService
import com.iamhuman.app.data.local.TokenStore
import com.iamhuman.app.data.models.ChallengeRequest
import com.iamhuman.app.data.models.DeviceVerifyRequest
import com.iamhuman.app.data.security.DeviceKeyManager
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.UUID

@Composable
fun VerifyDeviceScreen(
    api: ApiService,
    tokenStore: TokenStore,
    deviceKeyManager: DeviceKeyManager,
    onVerified: () -> Unit,
) {
    val tag = "VerifyDeviceScreen"
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var info by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val deviceId = remember {
        tokenStore.getDeviceId() ?: UUID.randomUUID().toString().also { tokenStore.saveDeviceId(it) }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF050509))
            .padding(horizontal = 32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("🔐", fontSize = 48.sp)
            Spacer(Modifier.height(24.dp))
            Text(
                "Verify this device",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFE8E8F0),
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Use deterministic device-key proof to complete verification.",
                fontSize = 14.sp,
                color = Color(0xFF8888A0),
                textAlign = TextAlign.Center,
            )

            if (info.isNotBlank()) {
                Spacer(Modifier.height(12.dp))
                Text(info, color = Color(0xFF7FC18A), fontSize = 13.sp, textAlign = TextAlign.Center)
            }

            if (error.isNotBlank()) {
                Spacer(Modifier.height(12.dp))
                Text(error, color = Color(0xFFFF4466), fontSize = 13.sp, textAlign = TextAlign.Center)
            }

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = {
                    scope.launch {
                        loading = true
                        error = ""
                        info = ""
                        try {
                            val publicKey = deviceKeyManager.publicKeyBase64()
                            Log.d(tag, "requesting challenge")
                            val challengeRes = api.requestChallenge(ChallengeRequest(publicKey, deviceId))
                            if (!challengeRes.isSuccessful || challengeRes.body()?.success != true) {
                                val raw = challengeRes.errorBody()?.string().orEmpty()
                                val backendError = try {
                                    if (raw.isBlank()) null else JSONObject(raw).optString("error").ifBlank { null }
                                } catch (_: Exception) {
                                    null
                                }
                                error = backendError ?: "Failed to get challenge"
                                return@launch
                            }

                            val nonce = challengeRes.body()!!.nonce
                            val signature = deviceKeyManager.signNonceBase64(nonce)
                            Log.d(tag, "submitting signature verification")
                            val verifyRes = api.verifyDevice(DeviceVerifyRequest(publicKey, nonce, signature, deviceId))

                            if (verifyRes.isSuccessful && verifyRes.body()?.success == true && verifyRes.body()?.verified == true) {
                                info = "Device verified successfully"
                                onVerified()
                            } else {
                                val raw = verifyRes.errorBody()?.string().orEmpty()
                                val backendError = try {
                                    if (raw.isBlank()) null else JSONObject(raw).optString("error").ifBlank { null }
                                } catch (_: Exception) {
                                    null
                                }
                                error = backendError ?: "Device verification failed"
                            }
                        } catch (e: Exception) {
                            Log.e(tag, "verification failed", e)
                            error = "Error: ${e.message}"
                        } finally {
                            loading = false
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !loading,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3D7FFF)),
            ) {
                if (loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.height(20.dp),
                        color = Color.White,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text("Verify Device", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
