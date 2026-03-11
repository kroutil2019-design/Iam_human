package com.iamhuman.app.data.security

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.Signature

class DeviceKeyManager(_context: Context) {
    private val keyStore: KeyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }

    fun ensureKeyPair() {
        if (keyStore.containsAlias(KEY_ALIAS)) return

        val keyPairGenerator = KeyPairGenerator.getInstance("Ed25519", "AndroidKeyStore")
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY,
        ).build()
        keyPairGenerator.initialize(spec)
        keyPairGenerator.generateKeyPair()
    }

    fun publicKeyBase64(): String {
        ensureKeyPair()
        val certificate = keyStore.getCertificate(KEY_ALIAS)
            ?: error("Device key certificate not found")
        return Base64.encodeToString(certificate.publicKey.encoded, Base64.NO_WRAP)
    }

    fun signNonceBase64(nonce: String): String {
        ensureKeyPair()
        val privateKey = keyStore.getKey(KEY_ALIAS, null) as? PrivateKey
            ?: error("Device private key not found")

        val signer = Signature.getInstance("Ed25519")
        signer.initSign(privateKey)
        signer.update(nonce.toByteArray(Charsets.UTF_8))
        val signature = signer.sign()
        return Base64.encodeToString(signature, Base64.NO_WRAP)
    }

    companion object {
        private const val KEY_ALIAS = "iamhuman_device_ed25519"
    }
}
