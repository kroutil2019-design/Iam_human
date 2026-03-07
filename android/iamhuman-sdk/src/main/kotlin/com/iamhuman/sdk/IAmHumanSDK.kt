package com.iamhuman.sdk

import android.content.Context
import android.content.Intent
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * IAmHumanSDK – integrate human proof verification into your Android app.
 *
 * Usage:
 * ```kotlin
 * IAmHumanSDK.initialize("https://your-api-host")
 * val isHuman = IAmHumanSDK.isVerifiedHuman(tokenValue)
 * ```
 */
object IAmHumanSDK {
    private const val IAM_HUMAN_PACKAGE = "com.iamhuman.app"
    private const val PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.iamhuman.app"

    private var baseUrl: String = "http://localhost:4000"
    private var apiKey: String? = null
    private lateinit var api: SdkApiService

    /**
     * Initialize the SDK with your backend URL.
     * @param baseUrl  Base URL of the IAmHuman API (e.g. "https://api.example.com")
     * @param apiKey   Optional API key for future authenticated endpoints
     */
    fun initialize(baseUrl: String, apiKey: String? = null) {
        this.baseUrl = baseUrl.trimEnd('/')
        this.apiKey = apiKey

        val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()

        api = Retrofit.Builder()
            .baseUrl("${this.baseUrl}/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(SdkApiService::class.java)
    }

    /**
     * Verify whether a given token_value represents a valid, unexpired human proof.
     * @param tokenValue  The token_value string from a ProofData object
     * @return true if the token is valid and active
     */
    suspend fun isVerifiedHuman(tokenValue: String): Boolean = withContext(Dispatchers.IO) {
        check(::api.isInitialized) { "IAmHumanSDK not initialized. Call initialize() first." }
        try {
            val res = api.verifyToken(VerifyRequest(tokenValue))
            res.isSuccessful && res.body()?.valid == true
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Get the current proof details for a given token value.
     * @param authToken  Bearer token of the authenticated user
     * @return [Proof] if a valid active proof exists, null otherwise
     */
    suspend fun getCurrentProof(authToken: String): Proof? = withContext(Dispatchers.IO) {
        check(::api.isInitialized) { "IAmHumanSDK not initialized. Call initialize() first." }
        try {
            val res = api.getCurrentProof("Bearer $authToken")
            if (res.isSuccessful) res.body()?.proof else null
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Verify a token and return a structured result with details.
     */
    suspend fun verifyToken(tokenValue: String): VerifyResult = withContext(Dispatchers.IO) {
        check(::api.isInitialized) { "IAmHumanSDK not initialized. Call initialize() first." }
        try {
            val res = api.verifyToken(VerifyRequest(tokenValue))
            val body = res.body()
            if (res.isSuccessful && body != null) {
                VerifyResult(
                    valid = body.valid,
                    reason = body.reason,
                    userId = body.userId,
                    issuedAt = body.issuedAt,
                    expiresAt = body.expiresAt,
                )
            } else {
                VerifyResult(valid = false, reason = "API error")
            }
        } catch (e: Exception) {
            VerifyResult(valid = false, reason = e.message)
        }
    }

    /**
     * Open the I Am Human app or the Play Store if not installed.
     */
    fun openIAmHumanAppOrPlayStore(context: Context) {
        val intent = context.packageManager.getLaunchIntentForPackage(IAM_HUMAN_PACKAGE)
        if (intent != null) {
            context.startActivity(intent)
        } else {
            context.startActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse(PLAY_STORE_URL)).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            )
        }
    }
}

data class VerifyResult(
    val valid: Boolean,
    val reason: String? = null,
    val userId: String? = null,
    val issuedAt: String? = null,
    val expiresAt: String? = null,
)
