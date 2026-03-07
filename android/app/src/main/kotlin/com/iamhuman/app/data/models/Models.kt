package com.iamhuman.app.data.models

import com.google.gson.annotations.SerializedName

data class RequestOtpBody(val email: String)

data class VerifyOtpBody(
    val email: String,
    val otp: String,
    @SerializedName("device_id") val deviceId: String,
)

data class SuccessResponse(val success: Boolean)

data class VerifyOtpResponse(
    val success: Boolean,
    @SerializedName("user_id") val userId: String,
    @SerializedName("auth_token") val authToken: String,
)

data class ProofData(
    @SerializedName("token_id") val tokenId: String,
    @SerializedName("token_value") val tokenValue: String,
    @SerializedName("user_id") val userId: String,
    @SerializedName("issued_at") val issuedAt: String,
    @SerializedName("expires_at") val expiresAt: String,
    val status: String,
)

data class ProofResponse(
    val success: Boolean,
    val proof: ProofData?,
)

data class UserData(
    val id: String,
    val email: String,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("verified_basic") val verifiedBasic: Boolean,
    @SerializedName("selfie_uploaded") val selfieUploaded: Boolean,
    val status: String,
)

data class UserResponse(
    val success: Boolean,
    val user: UserData?,
)
