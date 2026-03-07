package com.iamhuman.app.data.api

import com.iamhuman.app.data.models.*
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    @POST("auth/request-otp")
    suspend fun requestOtp(@Body body: RequestOtpBody): Response<SuccessResponse>

    @POST("auth/verify-otp")
    suspend fun verifyOtp(@Body body: VerifyOtpBody): Response<VerifyOtpResponse>

    @GET("user/me")
    suspend fun getMe(): Response<UserResponse>

    @Multipart
    @POST("user/selfie")
    suspend fun uploadSelfie(@Part selfie: MultipartBody.Part): Response<SuccessResponse>

    @DELETE("user/account")
    suspend fun deleteAccount(): Response<SuccessResponse>

    @POST("proofs/human")
    suspend fun issueProof(): Response<ProofResponse>

    @GET("proofs/current")
    suspend fun getCurrentProof(): Response<ProofResponse>
}
