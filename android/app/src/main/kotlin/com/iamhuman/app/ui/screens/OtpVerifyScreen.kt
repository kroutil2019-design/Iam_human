package com.iamhuman.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.iamhuman.app.data.api.ApiService
import com.iamhuman.app.data.local.TokenStore
import com.iamhuman.app.data.models.VerifyOtpBody
import kotlinx.coroutines.launch
import java.util.UUID

@Composable
fun OtpVerifyScreen(
    email: String,
    api: ApiService,
    tokenStore: TokenStore,
    onVerified: () -> Unit,
) {
    var otp by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    // Generate or retrieve device ID
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
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("🔑", fontSize = 48.sp)
            Spacer(Modifier.height(32.dp))
            Text(
                "Check your email",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFE8E8F0),
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Enter the 6-digit code sent to\n$email",
                fontSize = 14.sp,
                color = Color(0xFF8888A0),
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(32.dp))
            OutlinedTextField(
                value = otp,
                onValueChange = { if (it.length <= 6 && it.all { c -> c.isDigit() }) { otp = it; error = "" } },
                label = { Text("6-digit code") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFF3D7FFF),
                    unfocusedBorderColor = Color(0xFF2A2A38),
                    focusedTextColor = Color(0xFFE8E8F0),
                    unfocusedTextColor = Color(0xFFE8E8F0),
                    focusedLabelColor = Color(0xFF3D7FFF),
                    unfocusedLabelColor = Color(0xFF8888A0),
                    cursorColor = Color(0xFF3D7FFF),
                ),
            )
            if (error.isNotBlank()) {
                Spacer(Modifier.height(8.dp))
                Text(error, color = Color(0xFFFF4466), fontSize = 13.sp)
            }
            Spacer(Modifier.height(24.dp))
            Button(
                onClick = {
                    if (otp.length != 6) {
                        error = "Enter the 6-digit code"
                        return@Button
                    }
                    scope.launch {
                        loading = true
                        error = ""
                        try {
                            val res = api.verifyOtp(VerifyOtpBody(email, otp, deviceId))
                            if (res.isSuccessful && res.body()?.success == true) {
                                val body = res.body()!!
                                tokenStore.saveAuthToken(body.authToken)
                                tokenStore.saveUserId(body.userId)
                                tokenStore.saveEmail(email)
                                onVerified()
                            } else {
                                error = "Invalid or expired code"
                            }
                        } catch (e: Exception) {
                            error = "Network error: ${e.message}"
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
                        modifier = Modifier.size(20.dp),
                        color = Color.White,
                        strokeWidth = 2.dp,
                    )
                } else {
                    Text("Verify", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
