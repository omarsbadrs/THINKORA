// ---------------------------------------------------------------------------
// Authentication & identity types
// ---------------------------------------------------------------------------

/** Authenticated user profile. */
export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  createdAt: string;
}

/** Active session tokens + user reference. */
export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

/** Client-side authentication state. */
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/** Payload for signing in with email + password. */
export interface SignInRequest {
  email: string;
  password: string;
}

/** Payload for creating a new account. */
export interface SignUpRequest {
  email: string;
  password: string;
  fullName: string;
}

/** Payload for requesting a password reset email. */
export interface ResetPasswordRequest {
  email: string;
}
