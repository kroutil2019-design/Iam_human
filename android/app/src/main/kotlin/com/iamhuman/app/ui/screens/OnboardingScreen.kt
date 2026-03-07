package com.iamhuman.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

private data class Slide(val icon: String, val title: String, val subtitle: String)

private val slides = listOf(
    Slide("🧬", "You are human.\nLet's prove it.", "Deterministic proof of humanity."),
    Slide("🔐", "Get a reusable\nhuman proof token.", "One token. Many apps. Real you."),
    Slide("🌐", "Use it across apps\nthat require real humans.", "Share your proof. Keep your privacy."),
)

@Composable
fun OnboardingScreen(onGetStarted: () -> Unit) {
    val pagerState = rememberPagerState(pageCount = { slides.size })
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF050509)),
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize(),
        ) { page ->
            val slide = slides[page]
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 40.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(text = slide.icon, fontSize = 72.sp)
                Spacer(Modifier.height(32.dp))
                Text(
                    text = slide.title,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFE8E8F0),
                    textAlign = TextAlign.Center,
                    lineHeight = 36.sp,
                )
                Spacer(Modifier.height(16.dp))
                Text(
                    text = slide.subtitle,
                    fontSize = 15.sp,
                    color = Color(0xFF8888A0),
                    textAlign = TextAlign.Center,
                )
            }
        }

        // Page indicators
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 140.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            repeat(slides.size) { i ->
                val selected = pagerState.currentPage == i
                Box(
                    modifier = Modifier
                        .size(if (selected) 24.dp else 8.dp, 8.dp)
                        .background(
                            if (selected) Color(0xFF3D7FFF) else Color(0xFF2A2A38),
                            shape = MaterialTheme.shapes.small,
                        ),
                )
            }
        }

        // CTA button
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 48.dp)
                .padding(horizontal = 40.dp),
        ) {
            if (pagerState.currentPage == slides.size - 1) {
                Button(
                    onClick = onGetStarted,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3D7FFF)),
                ) {
                    Text("Get Started", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                }
            } else {
                TextButton(
                    onClick = {
                        scope.launch {
                            pagerState.animateScrollToPage(pagerState.currentPage + 1)
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Next →", color = Color(0xFF3D7FFF), fontSize = 15.sp)
                }
            }
        }
    }
}
