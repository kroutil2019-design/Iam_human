package com.iamhuman.app.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(onNavigate: () -> Unit) {
    val alpha by animateFloatAsState(
        targetValue = 1f,
        animationSpec = tween(durationMillis = 800),
        label = "fade",
    )

    LaunchedEffect(Unit) {
        delay(1800)
        onNavigate()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF050509)),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.alpha(alpha),
        ) {
            Text(
                text = "⬡",
                fontSize = 64.sp,
                color = Color(0xFF3D7FFF),
            )
            Spacer(Modifier.height(24.dp))
            Text(
                text = "I AM HUMAN",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFE8E8F0),
                letterSpacing = 0.15.sp,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = "Tier-0 Human Proof",
                fontSize = 13.sp,
                color = Color(0xFF8888A0),
                textAlign = TextAlign.Center,
                letterSpacing = 0.1.sp,
            )
        }
    }
}
