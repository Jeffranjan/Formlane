import type { SelectSession } from "@repo/database/schema";
import type { SelectUser } from "@repo/database/schema";

/**
 * The resolved session payload returned by AuthService.resolveSession.
 * Contains the session row plus the associated user.
 */
export interface ResolvedSession {
  session: SelectSession;
  user: Pick<SelectUser, "id" | "email" | "fullName" | "isAdmin">;
}

/** Result returned by signUp and signIn on success. */
export interface AuthResult {
  user: Pick<SelectUser, "id" | "email" | "fullName" | "isAdmin">;
  sessionId: string;
}

/**
 * Full interface for the AuthService covering sign-up, sign-in, sign-out,
 * and session resolution.
 */
export interface IAuthService {
  /**
   * Creates a new user account and establishes a session.
   * Validates password length >= 8 and email uniqueness.
   * Throws with code `email_already_in_use` if the email is taken.
   * Throws with code `validation_error` if the password is too short.
   */
  signUp(params: { email: string; password: string; fullName?: string }): Promise<AuthResult>;

  /**
   * Verifies credentials and establishes a session.
   * Throws with code `invalid_credentials` on mismatch.
   */
  signIn(params: { email: string; password: string }): Promise<AuthResult>;

  /**
   * Invalidates the given session.
   * No-ops silently if the session does not exist.
   */
  signOut(sessionId: string): Promise<void>;

  /**
   * Resolves a session cookie value to a session + user pair.
   * Returns null when the session id is unknown, expired, or invalid.
   */
  resolveSession(sessionId: string): Promise<ResolvedSession | null>;

  /**
   * Returns the Google OAuth authorization URL for the sign-in flow (Req. 1.9).
   * Returns null when Google OAuth is not configured (skip silently).
   */
  googleGetAuthUrl(): string | null;

  /**
   * Handles Google OAuth callback: exchanges the authorization code for tokens,
   * upserts the user, and creates a session (Req. 1.9).
   *
   * Returns null when Google OAuth is not configured (skip silently).
   * Throws with code `validation_error` on token exchange / verification failure.
   */
  googleOAuthSignIn(params: { code: string }): Promise<AuthResult | null>;
}
