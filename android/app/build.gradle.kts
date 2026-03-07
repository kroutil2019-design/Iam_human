plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

val configuredBaseUrl = (
    (project.findProperty("IAMHUMAN_BASE_URL") as String?)
        ?: System.getenv("IAMHUMAN_BASE_URL")
    ?: "https://effective-winner-97vgw4grpj963p5xp-4000.app.github.dev"
).trimEnd('/')

android {
    namespace = "com.iamhuman.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.iamhuman.app"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        buildConfigField("String", "BASE_URL", "\"$configuredBaseUrl\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = "11"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.security.crypto)
    implementation(libs.retrofit)
    implementation(libs.retrofit.gson)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.gson)
    implementation(libs.zxing.core)
    implementation(libs.coil.compose)
    implementation(project(":iamhuman-sdk"))

    debugImplementation(libs.androidx.ui.tooling)
}
