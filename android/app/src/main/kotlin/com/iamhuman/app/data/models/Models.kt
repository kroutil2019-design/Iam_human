package com.iamhuman.app.data.models

import com.google.gson.annotations.SerializedName

data class RequestOtpBody(val email: String)

data class VerifyOtpBody(
    val email: String,
    val otp: String,
    @SerializedName("device_id") val deviceId: String,
    @SerializedName("public_key") val publicKey: String,
)

data class SuccessResponse(
    val success: Boolean,
)

data class VerifyOtpResponse(
    val success: Boolean,
    @SerializedName("user_id") val userId: String,
    @SerializedName("auth_token") val authToken: String,
)

data class ChallengeRequest(
    val publicKey: String,
    @SerializedName("device_id") val deviceId: String,
)

data class ChallengeResponse(
    val success: Boolean,
    val nonce: String,
)

data class DeviceVerifyRequest(
    val publicKey: String,
    val nonce: String,
    val signature: String,
    @SerializedName("device_id") val deviceId: String,
)

data class DeviceVerifyResponse(
    val success: Boolean,
    val verified: Boolean,
    val proof: ProofData?,
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
    val status: String,
)

data class UserResponse(
    val success: Boolean,
    val user: UserData?,
)

data class ActionRequest(
    val device: ActionRequestDevice,
    val identity: ActionRequestIdentity,
    val intent: ActionRequestIntent,
    val legitimacy: ActionRequestLegitimacy,
    val context: ActionRequestContext,
    val capability: ActionRequestCapability,
    val payload: Map<String, @JvmSuppressWildcards Any>,
)

data class ActionRequestDevice(
    val deviceId: String,
    val publicKey: String? = null,
    val fingerprint: String? = null,
)

data class ActionRequestIdentity(
    val actorId: String,
    val actorType: String,
    val sessionId: String? = null,
)

data class ActionRequestIntent(
    val actionType: String,
)

data class ActionRequestLegitimacy(
    val authMethod: String,
    val trustLevel: String,
    val evidence: List<String>? = null,
)

data class ActionRequestContext(
    val route: String,
    val requestId: String? = null,
    val userAgent: String? = null,
    val ipAddress: String? = null,
)

data class ActionRequestCapability(
    val permissions: List<String>,
    val constraintsVersion: String,
)

data class ActionExecuteResponse(
    val status: String,
    val polarity: String,
    val eventHash: String,
    val output: Map<String, @JvmSuppressWildcards Any>? = null,
    val reason: String? = null,
)

data class ActionIndexResponse(
    val totals: ActionIndexTotals,
    val byIntent: Map<String, Int>,
    val byCapability: Map<String, Int>,
    val byFailureReason: Map<String, Int>,
)

data class ActionIndexTotals(
    val received: Int,
    val configurationBuilt: Int,
    val zGateValidated: Int,
    val constraintEvaluated: Int,
    val passed: Int,
    val failed: Int,
    val polarityPositive: Int,
    val polarityNegative: Int,
    val executionStarted: Int,
    val executionCompleted: Int,
    val executionFailed: Int,
)
