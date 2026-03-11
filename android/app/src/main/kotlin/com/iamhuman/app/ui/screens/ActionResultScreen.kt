package com.iamhuman.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.google.gson.GsonBuilder
import com.iamhuman.app.data.models.ActionExecuteResponse

@Composable
fun ActionResultScreen(
    response: ActionExecuteResponse?,
    uiState: ActionUiState,
    onBackHome: () -> Unit,
    onExecuteAnother: () -> Unit,
) {
    val background = Brush.linearGradient(
        colors = listOf(Color(0xFF050608), Color(0xFF0B0D10), Color(0xFF020202))
    )

    val gson = GsonBuilder().setPrettyPrinting().create()
    val outputJson = response?.output?.let { gson.toJson(it) } ?: "-"

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = "Deterministic Result",
            color = Color(0xFFECEEF1),
            fontWeight = FontWeight.SemiBold,
        )

        Card(
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF13171C)),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("UI State: $uiState", color = colorForState(uiState), fontWeight = FontWeight.SemiBold)
                Text("status: ${response?.status ?: "fail"}", color = Color(0xFFECEEF1))
                Text("polarity: ${response?.polarity ?: "-"}", color = Color(0xFFECEEF1))
                Text("eventHash: ${response?.eventHash ?: "unavailable"}", color = Color(0xFFBFC6CD))
                Text("reason: ${response?.reason ?: "-"}", color = Color(0xFFBFC6CD))
                Text("output:", color = Color(0xFFECEEF1), fontWeight = FontWeight.Medium)
                Text(outputJson, color = Color(0xFF97A0AA))
            }
        }

        Button(
            onClick = onExecuteAnother,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1B2026), contentColor = Color(0xFFF4F6F8)),
        ) {
            Text("Execute Another Action")
        }

        Button(
            onClick = onBackHome,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF13171C), contentColor = Color(0xFFBFC6CD)),
        ) {
            Text("Back Home")
        }
    }
}

private fun colorForState(state: ActionUiState): Color {
    return when (state) {
        ActionUiState.PASS -> Color(0xFF5CBF96)
        ActionUiState.FAIL -> Color(0xFFDB4F5F)
        ActionUiState.NETWORK_ERROR -> Color(0xFFDB4F5F)
        ActionUiState.LOADING -> Color(0xFFBFC6CD)
        ActionUiState.IDLE -> Color(0xFF97A0AA)
    }
}
