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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.iamhuman.app.data.api.TrustFabricApi
import com.iamhuman.app.data.models.ActionIndexResponse
import com.iamhuman.app.data.models.ActionIndexTotals

@Composable
fun ActionIndexScreen(
    trustFabricApi: TrustFabricApi,
    onBack: () -> Unit,
) {
    var loading by remember { mutableStateOf(true) }
    var indexResponse by remember { mutableStateOf<ActionIndexResponse?>(null) }
    var errorText by remember { mutableStateOf("") }

    val background = Brush.linearGradient(
        colors = listOf(Color(0xFF050608), Color(0xFF0B0D10), Color(0xFF020202))
    )

    LaunchedEffect(Unit) {
        loading = true
        errorText = ""
        try {
            indexResponse = trustFabricApi.getActionIndex()
        } catch (error: Exception) {
            errorText = "Fail closed: ${error.message ?: "network error"}"
        } finally {
            loading = false
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = "Action Index / Metrics",
            color = Color(0xFFECEEF1),
            fontWeight = FontWeight.SemiBold,
        )

        when {
            loading -> CircularProgressIndicator(color = Color(0xFFC5CDD5))
            errorText.isNotBlank() -> Text(errorText, color = Color(0xFFDB4F5F))
            else -> {
                indexResponse?.let { response ->
                    TotalsCard(response.totals)
                    KeyValueListCard("byIntent", response.byIntent)
                    KeyValueListCard("byCapability", response.byCapability)
                    KeyValueListCard("byFailureReason", response.byFailureReason)
                }
            }
        }

        Button(
            onClick = onBack,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF13171C), contentColor = Color(0xFFBFC6CD)),
        ) {
            Text("Back")
        }
    }
}

@Composable
private fun TotalsCard(totals: ActionIndexTotals) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF13171C)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text("received: ${totals.received}", color = Color(0xFFECEEF1))
            Text("passed: ${totals.passed}", color = Color(0xFF5CBF96))
            Text("failed: ${totals.failed}", color = Color(0xFFDB4F5F))
            Text("polarityPositive: ${totals.polarityPositive}", color = Color(0xFFECEEF1))
            Text("polarityNegative: ${totals.polarityNegative}", color = Color(0xFFECEEF1))
        }
    }
}

@Composable
private fun KeyValueListCard(
    title: String,
    values: Map<String, Int>,
) {
    Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF13171C)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, color = Color(0xFFECEEF1), fontWeight = FontWeight.Medium)

            if (values.isEmpty()) {
                Text("No entries", color = Color(0xFF97A0AA))
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                    values.toList().forEach { (key, value) ->
                        Text("$key: $value", color = Color(0xFFBFC6CD))
                    }
                }
            }
        }
    }
}
