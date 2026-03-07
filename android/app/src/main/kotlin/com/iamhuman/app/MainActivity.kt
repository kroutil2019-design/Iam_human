package com.iamhuman.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.iamhuman.app.ui.theme.IAmHumanTheme
import com.iamhuman.app.navigation.AppNavGraph

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            IAmHumanTheme {
                AppNavGraph()
            }
        }
    }
}
