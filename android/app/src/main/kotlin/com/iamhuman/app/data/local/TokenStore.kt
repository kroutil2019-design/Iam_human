package com.iamhuman.app.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class TokenStore(context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "iah_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    fun saveAuthToken(token: String) = prefs.edit().putString(KEY_AUTH_TOKEN, token).apply()
    fun getAuthToken(): String? = prefs.getString(KEY_AUTH_TOKEN, null)

    fun saveUserId(id: String) = prefs.edit().putString(KEY_USER_ID, id).apply()
    fun getUserId(): String? = prefs.getString(KEY_USER_ID, null)

    fun saveEmail(email: String) = prefs.edit().putString(KEY_EMAIL, email).apply()
    fun getEmail(): String? = prefs.getString(KEY_EMAIL, null)

    fun saveDeviceId(id: String) = prefs.edit().putString(KEY_DEVICE_ID, id).apply()
    fun getDeviceId(): String? = prefs.getString(KEY_DEVICE_ID, null)

    fun isLoggedIn(): Boolean = getAuthToken() != null

    fun clear() = prefs.edit().clear().apply()

    companion object {
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_EMAIL = "email"
        private const val KEY_DEVICE_ID = "device_id"
    }
}
