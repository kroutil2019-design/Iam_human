package com.iamhuman.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val BgColor = Color(0xFF050608)
private val SurfaceColor = Color(0xFF13171C)
private val AccentBlue = Color(0xFF6F7A86)
private val TextColor = Color(0xFFECEEF1)
private val TextDim = Color(0xFF97A0AA)

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
