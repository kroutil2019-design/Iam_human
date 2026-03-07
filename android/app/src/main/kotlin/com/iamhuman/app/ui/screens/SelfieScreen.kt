package com.iamhuman.app.ui.screens

import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import com.iamhuman.app.data.api.ApiService
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File

@Composable
fun SelfieScreen(api: ApiService, onDone: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var imageUri by remember { mutableStateOf<Uri?>(null) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var uploaded by remember { mutableStateOf(false) }

    val cameraFile = remember {
        File(context.cacheDir, "selfie_${System.currentTimeMillis()}.jpg")
    }
    val cameraUri = remember {
        FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", cameraFile)
    }

    val takePicture = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture(),
    ) { success ->
        if (success) imageUri = cameraUri
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF050509))
            .padding(horizontal = 32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("📸", fontSize = 48.sp)
            Spacer(Modifier.height(24.dp))
            Text(
                "Take a selfie",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFE8E8F0),
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Optional – helps confirm you're human.\nYou can skip this step.",
                fontSize = 14.sp,
                color = Color(0xFF8888A0),
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(32.dp))

            if (imageUri != null) {
                AsyncImage(
                    model = imageUri,
                    contentDescription = "Selfie preview",
                    modifier = Modifier.size(200.dp),
                )
                Spacer(Modifier.height(16.dp))
            }

            if (!uploaded) {
                Button(
                    onClick = { takePicture.launch(cameraUri) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1A1A24)),
                ) {
                    Text(
                        if (imageUri == null) "Open Camera" else "Retake",
                        color = Color(0xFF3D7FFF),
                    )
                }
                Spacer(Modifier.height(8.dp))
                if (imageUri != null) {
                    Button(
                        onClick = {
                            scope.launch {
                                loading = true
                                error = ""
                                try {
                                    val file = cameraFile
                                    val body = file.asRequestBody("image/jpeg".toMediaTypeOrNull())
                                    val part = MultipartBody.Part.createFormData("selfie", file.name, body)
                                    val res = api.uploadSelfie(part)
                                    if (res.isSuccessful) {
                                        uploaded = true
                                    } else {
                                        error = "Upload failed"
                                    }
                                } catch (e: Exception) {
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
                        if (loading) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                        else Text("Upload Selfie", fontWeight = FontWeight.SemiBold)
                    }
                    Spacer(Modifier.height(8.dp))
                }
            } else {
                Text("✓ Selfie uploaded!", color = Color(0xFF44FF99), fontSize = 16.sp)
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = onDone,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3D7FFF)),
                ) {
                    Text("Continue", fontWeight = FontWeight.SemiBold)
                }
            }

            if (error.isNotBlank()) {
                Spacer(Modifier.height(8.dp))
                Text(error, color = Color(0xFFFF4466), fontSize = 13.sp)
            }
            Spacer(Modifier.height(16.dp))
            TextButton(onClick = onDone) {
                Text("Skip for now", color = Color(0xFF8888A0))
            }
        }
    }
}
