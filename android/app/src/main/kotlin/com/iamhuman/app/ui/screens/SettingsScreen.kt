package com.iamhuman.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.iamhuman.app.data.api.ApiService
import com.iamhuman.app.data.local.TokenStore
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    tokenStore: TokenStore,
    api: ApiService,
    onReVerify: () -> Unit,
    onAccountDeleted: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var showDeleteDialog by remember { mutableStateOf(false) }

    val email = remember { tokenStore.getEmail() ?: "—" }
    val deviceId = remember { tokenStore.getDeviceId() ?: "—" }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete Account?", color = Color(0xFFE8E8F0)) },
            text = { Text("This will soft-delete your account and clear local data. Continue?", color = Color(0xFF8888A0)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        scope.launch {
                            loading = true
                            try {
                                api.deleteAccount()
                            } catch (_: Exception) {}
                            tokenStore.clear()
                            onAccountDeleted()
                        }
                    }
                ) {
                    Text("Delete", color = Color(0xFFFF4466))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) {
                    Text("Cancel", color = Color(0xFF8888A0))
                }
            },
            containerColor = Color(0xFF0E0E14),
        )
    }

    Scaffold(
        containerColor = Color(0xFF050509),
        topBar = {
            TopAppBar(
                title = { Text("Settings", color = Color(0xFFE8E8F0), fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF050509)),
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 24.dp),
        ) {
            Spacer(Modifier.height(16.dp))

            SettingsItem("Email", email)
            HorizontalDivider(color = Color(0xFF1A1A24))
            SettingsItem("Device ID", deviceId.take(16) + "…")
            HorizontalDivider(color = Color(0xFF1A1A24))

            Spacer(Modifier.height(32.dp))

            Button(
                onClick = onReVerify,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1A1A24)),
            ) {
                Text("Re-verify Email", color = Color(0xFF3D7FFF))
            }

            Spacer(Modifier.height(12.dp))

            Button(
                onClick = { showDeleteDialog = true },
                modifier = Modifier.fillMaxWidth(),
                enabled = !loading,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1A1A24)),
            ) {
                Text("Delete Account", color = Color(0xFFFF4466))
            }

            if (error.isNotBlank()) {
                Spacer(Modifier.height(12.dp))
                Text(error, color = Color(0xFFFF4466), fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun SettingsItem(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, color = Color(0xFF8888A0), fontSize = 14.sp)
        Text(value, color = Color(0xFFE8E8F0), fontSize = 14.sp, fontWeight = FontWeight.Medium)
    }
}
