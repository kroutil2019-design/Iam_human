package com.iamhuman.app.data.api

import android.util.Log
import com.iamhuman.app.data.models.ActionExecuteResponse
import com.iamhuman.app.data.models.ActionIndexResponse
import com.iamhuman.app.data.models.ActionRequest

class TrustFabricApi(private val apiService: ApiService) {
    companion object {
        private const val TAG = "TrustFabricApi"
    }

    suspend fun executeAction(request: ActionRequest): ActionExecuteResponse {
        Log.d(
            TAG,
            "executeAction request actionType=${request.intent.actionType} permissions=${request.capability.permissions.size} actorId=${request.identity.actorId}"
        )

        val response = apiService.executeAction(request)
        if (response.isSuccessful) {
            val body = response.body()
            if (body != null) {
                Log.d(
                    TAG,
                    "executeAction response status=${body.status} polarity=${body.polarity} eventHash=${body.eventHash} reason=${body.reason}"
                )
                return body
            }
        }

        Log.e(TAG, "executeAction failed with HTTP ${response.code()}")
        throw IllegalStateException("Execution request failed with HTTP ${response.code()}")
    }

    suspend fun getActionIndex(): ActionIndexResponse {
        Log.d(TAG, "getActionIndex request")

        val response = apiService.getActionIndex()
        if (response.isSuccessful) {
            val body = response.body()
            if (body != null) {
                Log.d(
                    TAG,
                    "getActionIndex response received=${body.totals.received} passed=${body.totals.passed} failed=${body.totals.failed} polarityPositive=${body.totals.polarityPositive} polarityNegative=${body.totals.polarityNegative}"
                )
                return body
            }
        }

        Log.e(TAG, "getActionIndex failed with HTTP ${response.code()}")
        throw IllegalStateException("Action index request failed with HTTP ${response.code()}")
    }
}
