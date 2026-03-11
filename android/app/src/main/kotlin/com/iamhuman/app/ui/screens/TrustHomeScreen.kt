package com.iamhuman.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun TrustHomeScreen(
    onExecuteAction: () -> Unit,
    onActionIndex: () -> Unit,
) {
    val background = Brush.linearGradient(
        colors = listOf(
            Color(0xFF050608),
            Color(0xFF0B0D10),
            Color(0xFF020202),
        )
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(background)
            .padding(20.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = "Trust Fabric Client",
                style = MaterialTheme.typography.headlineMedium,
                color = Color(0xFFECEEF1),
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 1.sp,
            )

            Text(
                text = "Thin Android surface. Deterministic trust decisions stay in backend.",
                color = Color(0xFF97A0AA),
                fontSize = 14.sp,
            )

            Button(
                onClick = onExecuteAction,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF1B2026),
                    contentColor = Color(0xFFF4F6F8),
                )
            ) {
                Text("Execute Action")
            }

            Button(
                onClick = onActionIndex,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF1B2026),
                    contentColor = Color(0xFFF4F6F8),
                )
            ) {
                Text("Action Index / Metrics")
            }
        }
    }
}
