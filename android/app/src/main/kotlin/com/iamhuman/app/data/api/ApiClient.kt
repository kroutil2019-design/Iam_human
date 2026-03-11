package com.iamhuman.app.data.api

import com.iamhuman.app.BuildConfig
import com.iamhuman.app.data.local.TokenStore
import android.util.Log
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    private const val TAG = "TrustFabricApiClient"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BODY
        } else {
            HttpLoggingInterceptor.Level.NONE
        }
    }

    fun build(tokenStore: TokenStore? = null): ApiService {
        val client = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .addInterceptor { chain ->
                val req = chain.request().newBuilder()
                val token = tokenStore?.getAuthToken()
                if (!token.isNullOrBlank()) {
                    req.addHeader("Authorization", "Bearer $token")
                }

                val built = req.build()
                if (BuildConfig.DEBUG) {
                    Log.d(TAG, "-> ${built.method} ${built.url}")
                }

                val response = chain.proceed(built)
                if (BuildConfig.DEBUG) {
                    Log.d(TAG, "<- ${response.code} ${response.request.url}")
                }

                response
            }
            .connectTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(ApiConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }
}
