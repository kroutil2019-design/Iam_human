package com.iamhuman.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val BgColor = Color(0xFF050509)
private val SurfaceColor = Color(0xFF0E0E14)
private val AccentBlue = Color(0xFF3D7FFF)
private val TextColor = Color(0xFFE8E8F0)
private val TextDim = Color(0xFF8888A0)

private val DarkColorScheme = darkColorScheme(
    primary = AccentBlue,
    background = BgColor,
    surface = SurfaceColor,
    onPrimary = Color.White,
    onBackground = TextColor,
    onSurface = TextColor,
    secondary = TextDim,
)

@Composable
fun IAmHumanTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content,
    )
}
