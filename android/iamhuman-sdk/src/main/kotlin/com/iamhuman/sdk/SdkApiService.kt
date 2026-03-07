package com.iamhuman.sdk

import retrofit2.Response
import retrofit2.http.*

internal interface SdkApiService {
    @POST("proofs/verify")
    suspend fun verifyToken(@Body body: VerifyRequest): Response<VerifyResponse>

    @GET("proofs/current")
    suspend fun getCurrentProof(@Header("Authorization") bearerToken: String): Response<CurrentProofResponse>
}
