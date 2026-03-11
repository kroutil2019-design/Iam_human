export interface User {
  id: string;
  email: string;
  created_at: string;
  verified_basic: boolean;
  status: string;
}

export interface Proof {
  id: string;
  token_id: string;
  token_value: string;
  user_email: string;
  status: string;
  issued_at: string;
  expires_at: string;
  revoked_at?: string;
  revoke_reason?: string;
}
