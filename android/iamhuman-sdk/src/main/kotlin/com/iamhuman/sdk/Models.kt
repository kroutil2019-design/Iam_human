package com.iamhuman.sdk

import com.google.gson.annotations.SerializedName

data class Proof(
    @SerializedName("token_id")    val tokenId: String,
    @SerializedName("token_value") val tokenValue: String,
    @SerializedName("user_id")     val userId: String,
    @SerializedName("issued_at")   val issuedAt: String,
    @SerializedName("expires_at")  val expiresAt: String,
    val status: String,
)

internal data class VerifyRequest(@SerializedName("token_value") val tokenValue: String)

internal data class VerifyResponse(
    val valid: Boolean,
    val reason: String?,
    @SerializedName("user_id")    val userId: String?,
    @SerializedName("issued_at")  val issuedAt: String?,
    @SerializedName("expires_at") val expiresAt: String?,
)

internal data class CurrentProofResponse(
    val success: Boolean,
    val proof: Proof?,
)
