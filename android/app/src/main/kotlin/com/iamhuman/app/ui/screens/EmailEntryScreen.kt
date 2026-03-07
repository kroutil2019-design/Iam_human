package com.iamhuman.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.iamhuman.app.data.api.ApiService
import com.iamhuman.app.data.models.RequestOtpBody
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable
fun EmailEntryScreen(api: ApiService, onOtpSent: (String) -> Unit) {
    var email by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    val submit = {
        if (email.isBlank() || !email.contains('@')) {
            error = "Enter a valid email address"
        } else {
            scope.launch {
                loading = true
                error = ""
                try {
                    val res = api.requestOtp(RequestOtpBody(email.trim().lowercase()))
                    if (res.isSuccessful) {
                        onOtpSent(email.trim().lowercase())
                    } else {
                        val backendError = try {
                            val raw = res.errorBody()?.string().orEmpty()
                            if (raw.isBlank()) null else JSONObject(raw).optString("error").ifBlank { null }
                        } catch (_: Exception) {
                            null
                        }

                        error = backendError ?: "Failed to send OTP. Please try again."
                    }
                } catch (e: Exception) {
                    error = "Network error: ${e.message}"
                } finally {
                    loading = false
                }
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF050509))
            .padding(horizontal = 32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("⬡", fontSize = 48.sp, color = Color(0xFF3D7FFF))
            Spacer(Modifier.height(32.dp))
            Text(
                "Enter your email",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFE8E8F0),
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "We'll send you a one-time code",
                fontSize = 14.sp,
                color = Color(0xFF8888A0),
            )
            Spacer(Modifier.height(32.dp))
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; error = "" },
                label = { Text("Email address") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Done,
                ),
                keyboardActions = KeyboardActions(onDone = { submit() }),
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
                onClick = { submit() },
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
                    Text("Send Code", fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
