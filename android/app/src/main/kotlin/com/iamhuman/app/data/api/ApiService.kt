package com.iamhuman.app.data.api

import com.iamhuman.app.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    @POST("auth/request-otp")
    suspend fun requestOtp(@Body body: RequestOtpBody): Response<SuccessResponse>

    @POST("auth/verify-otp")
    suspend fun verifyOtp(@Body body: VerifyOtpBody): Response<VerifyOtpResponse>

    @POST("auth/challenge")
    suspend fun requestChallenge(@Body body: ChallengeRequest): Response<ChallengeResponse>

    @POST("auth/verify")
    suspend fun verifyDevice(@Body body: DeviceVerifyRequest): Response<DeviceVerifyResponse>

    @GET("user/me")
    suspend fun getMe(): Response<UserResponse>

    @DELETE("user/account")
    suspend fun deleteAccount(): Response<SuccessResponse>

    @POST("proofs/human")
    suspend fun issueProof(): Response<ProofResponse>

    @GET("proofs/current")
    suspend fun getCurrentProof(): Response<ProofResponse>

    @POST("actions/execute")
    suspend fun executeAction(@Body body: ActionRequest): Response<ActionExecuteResponse>

    @GET("actions/index")
    suspend fun getActionIndex(): Response<ActionIndexResponse>
}
