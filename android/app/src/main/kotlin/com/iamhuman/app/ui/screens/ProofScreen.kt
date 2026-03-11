package com.iamhuman.app.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.iamhuman.app.data.api.ApiService
import com.iamhuman.app.data.models.ProofData
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable
fun ProofScreen(
    api: ApiService,
    onSettings: () -> Unit,
    onVerifyDevice: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var proof by remember { mutableStateOf<ProofData?>(null) }
    var deviceVerified by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var toastMsg by remember { mutableStateOf("") }

    val loadProof = {
        scope.launch {
            loading = true
            error = ""
            try {
                val res = api.getCurrentProof()
                if (res.isSuccessful) proof = res.body()?.proof
                else error = "Failed to load proof"

                val meRes = api.getMe()
                if (meRes.isSuccessful) {
                    deviceVerified = meRes.body()?.user?.verifiedBasic == true
                }
            } catch (e: Exception) {
                error = "Network error: ${e.message}"
            } finally {
                loading = false
            }
        }
    }

    LaunchedEffect(Unit) { loadProof() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF050509)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "I AM HUMAN",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFE8E8F0),
                    letterSpacing = 0.1.sp,
                )
                IconButton(onClick = onSettings) {
                    Icon(Icons.Default.Settings, contentDescription = "Settings", tint = Color(0xFF8888A0))
                }
            }

            Spacer(Modifier.height(32.dp))

            if (loading) {
                CircularProgressIndicator(color = Color(0xFF3D7FFF))
            } else if (proof != null) {
                VerifiedCard(
                    proof = proof!!,
                    onIssueNew = {
                        scope.launch {
                            loading = true
                            try {
                                val res = api.issueProof()
                                if (res.isSuccessful) proof = res.body()?.proof
                                else error = "Failed to issue proof"
                            } catch (e: Exception) {
                                error = "Error: ${e.message}"
                            } finally {
                                loading = false
                            }
                        }
                    },
                    onShare = {
                        val intent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, proof!!.tokenValue)
                        }
                        context.startActivity(Intent.createChooser(intent, "Share Human Proof Token"))
                    },
                    onCopy = {
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        clipboard.setPrimaryClip(ClipData.newPlainText("HPT", proof!!.tokenValue))
                        toastMsg = "Token copied!"
                    },
                )
            } else {
                NotVerifiedCard(
                    deviceVerified = deviceVerified,
                    onRefresh = { loadProof() },
                    onIssue = {
                        scope.launch {
                            loading = true
                            try {
                                val res = api.issueProof()
                                if (res.isSuccessful) proof = res.body()?.proof
                                else {
                                    val backendError = try {
                                        val raw = res.errorBody()?.string().orEmpty()
                                        if (raw.isBlank()) null else JSONObject(raw).optString("error").ifBlank { null }
                                    } catch (_: Exception) {
                                        null
                                    }
                                    error = backendError ?: "Verification incomplete. Verify this device first."
                                }
                            } catch (e: Exception) {
                                error = "Error: ${e.message}"
                            } finally {
                                loading = false
                            }
                        }
                    },
                    onVerifyDevice = onVerifyDevice,
                )
            }

            if (error.isNotBlank()) {
                Spacer(Modifier.height(16.dp))
                Text(error, color = Color(0xFFFF4466), fontSize = 13.sp, textAlign = TextAlign.Center)
            }

            if (toastMsg.isNotBlank()) {
                Spacer(Modifier.height(8.dp))
                Text(toastMsg, color = Color(0xFF44FF99), fontSize = 13.sp)
                LaunchedEffect(toastMsg) {
                    kotlinx.coroutines.delay(2000)
                    toastMsg = ""
                }
            }
        }
    }
}

@Composable
private fun VerifiedCard(
    proof: ProofData,
    onIssueNew: () -> Unit,
    onShare: () -> Unit,
    onCopy: () -> Unit,
) {
    val qrBitmap = remember(proof.tokenValue) {
        generateQrBitmap(proof.tokenValue, 512)
    }

    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color(0xFF0E0E14),
        modifier = Modifier.fillMaxWidth(),
        tonalElevation = 4.dp,
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("✓", fontSize = 48.sp, color = Color(0xFF44FF99))
            Spacer(Modifier.height(8.dp))
            Text(
                "VERIFIED HUMAN",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF44FF99),
                letterSpacing = 0.1.sp,
            )
            Spacer(Modifier.height(24.dp))

            InfoRow("Token ID", proof.tokenId.take(8) + "…")
            InfoRow("Issued", proof.issuedAt.take(10))
            InfoRow("Expires", proof.expiresAt.take(10))
            InfoRow("Status", proof.status.uppercase())

            Spacer(Modifier.height(24.dp))

            if (qrBitmap != null) {
                Image(
                    bitmap = qrBitmap.asImageBitmap(),
                    contentDescription = "QR Code",
                    modifier = Modifier.size(220.dp),
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "Scan to verify this token",
                    fontSize = 12.sp,
                    color = Color(0xFF8888A0),
                )
            }

            Spacer(Modifier.height(24.dp))

            Button(
                onClick = onShare,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3D7FFF)),
            ) {
                Text("Share Token", fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(
                onClick = onCopy,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF3D7FFF)),
            ) {
                Text("Copy Token")
            }
            Spacer(Modifier.height(8.dp))
            TextButton(
                onClick = onIssueNew,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Issue New Proof", color = Color(0xFF8888A0))
            }
        }
    }
}

@Composable
private fun NotVerifiedCard(
    deviceVerified: Boolean,
    onRefresh: () -> Unit,
    onIssue: () -> Unit,
    onVerifyDevice: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = Color(0xFF0E0E14),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("⬡", fontSize = 48.sp, color = Color(0xFF3D7FFF))
            Spacer(Modifier.height(12.dp))
            Text(
                "Not yet verified",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFE8E8F0),
            )
            Spacer(Modifier.height(8.dp))
            Text(
                if (deviceVerified) {
                    "Device verified. Issue your Human Proof Token."
                } else {
                    "Complete deterministic device\nverification first"
                },
                fontSize = 14.sp,
                color = Color(0xFF8888A0),
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(24.dp))
            if (deviceVerified) {
                Button(
                    onClick = onIssue,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3D7FFF)),
                ) {
                    Text("Issue Proof", fontWeight = FontWeight.SemiBold)
                }
            } else {
                OutlinedButton(
                    onClick = onVerifyDevice,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF3D7FFF)),
                ) {
                    Text("Verify Device")
                }
            }
            Spacer(Modifier.height(8.dp))
            TextButton(onClick = onRefresh) {
                Text("Refresh Status", color = Color(0xFF8888A0))
            }
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, color = Color(0xFF8888A0), fontSize = 13.sp)
        Text(value, color = Color(0xFFE8E8F0), fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}

private fun generateQrBitmap(content: String, size: Int): Bitmap? {
    return try {
        val hints = mapOf(EncodeHintType.MARGIN to 1)
        val bitMatrix = QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, size, size, hints)
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)
        for (x in 0 until size) {
            for (y in 0 until size) {
                bmp.setPixel(x, y, if (bitMatrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
            }
        }
        bmp
    } catch (_: Exception) {
        null
    }
}
