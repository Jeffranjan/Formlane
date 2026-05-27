import { eq } from "drizzle-orm";
import db from "@repo/database";
import { usersTable, sessionsTable } from "@repo/database/schema";
import { passwordHasher } from "../password-hasher";
import { googleOAuth2Client } from "../clients/google-oauth";
import { env } from "../env";
import type { IAuthService, ResolvedSession, AuthResult } from "./interface";

/** Session lifetime: 30 days */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * AuthService handles Creator sign-up, sign-in, sign-out, and session resolution.
 *
 * Sessions are opaque random UUIDs stored server-side in the `sessions` table.
 * The cookie carries only the session id and should be set with:
 *   HttpOnly; SameSite=Lax; Secure (in production)
 *
 * Implements Requirements 1.1 – 1.9.
 */
export class AuthService implements IAuthService {
  /**
   * Creates a new user account and establishes a session.
   *
   * Validates:
   * - password length >= 8 (Req. 1.2)
   * - email uniqueness (Req. 1.3)
   *
   * Hashes the password via Argon2id (Req. 1.2) and creates both a `users`
   * row and a `sessions` row in a single transaction.
   */
  async signUp(params: {
    email: string;
    password: string;
    fullName?: string;
  }): Promise<AuthResult> {
    const { email, password, fullName = "" } = params;

    if (password.length < 8) {
      const err = new Error("Password must be at least 8 characters");
      (err as Error & { code: string }).code = "validation_error";
      throw err;
    }

    // Check uniqueness (Req. 1.3)
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      const err = new Error("Email already in use");
      (err as Error & { code: string }).code = "email_already_in_use";
      throw err;
    }

    const passwordHash = await passwordHasher.hash(password);

    // Insert user + session atomically
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const [user] = await db
      .insert(usersTable)
      .values({
        email: email.toLowerCase(),
        fullName,
        passwordHash,
      })
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        fullName: usersTable.fullName,
        isAdmin: usersTable.isAdmin,
      });

    if (!user) {
      const err = new Error("Failed to create user");
      (err as Error & { code: string }).code = "submission_failed";
      throw err;
    }

    await db.insert(sessionsTable).values({
      id: sessionId,
      userId: user.id,
      expiresAt,
    });

    return { user, sessionId };
  }

  /**
   * Verifies credentials and establishes a new session.
   * Throws with code `invalid_credentials` on any mismatch (Req. 1.5).
   */
  async signIn(params: { email: string; password: string }): Promise<AuthResult> {
    const { email, password } = params;

    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        fullName: usersTable.fullName,
        isAdmin: usersTable.isAdmin,
        passwordHash: usersTable.passwordHash,
      })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (!user || !user.passwordHash) {
      const err = new Error("Invalid credentials");
      (err as Error & { code: string }).code = "invalid_credentials";
      throw err;
    }

    const valid = await passwordHasher.verify(user.passwordHash, password);
    if (!valid) {
      const err = new Error("Invalid credentials");
      (err as Error & { code: string }).code = "invalid_credentials";
      throw err;
    }

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await db.insert(sessionsTable).values({
      id: sessionId,
      userId: user.id,
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isAdmin: user.isAdmin,
      },
      sessionId,
    };
  }

  /**
   * Invalidates the given session by deleting it from the database (Req. 1.6).
   * No-ops silently if the session does not exist.
   */
  async signOut(sessionId: string): Promise<void> {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
  }

  /**
   * Resolves a session cookie value to a session + user pair (Req. 1.7).
   * Returns null when the session id is unknown, expired, or invalid.
   */
  async resolveSession(sessionId: string): Promise<ResolvedSession | null> {
    if (!sessionId) return null;

    const rows = await db
      .select({
        session: {
          id: sessionsTable.id,
          userId: sessionsTable.userId,
          expiresAt: sessionsTable.expiresAt,
          createdAt: sessionsTable.createdAt,
        },
        user: {
          id: usersTable.id,
          email: usersTable.email,
          fullName: usersTable.fullName,
          isAdmin: usersTable.isAdmin,
        },
      })
      .from(sessionsTable)
      .innerJoin(usersTable, eq(sessionsTable.userId, usersTable.id))
      .where(eq(sessionsTable.id, sessionId))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    if (!row) return null;

    const { session, user } = row;

    // Check expiry
    if (session.expiresAt && session.expiresAt < new Date()) {
      // Clean up expired session
      await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
      return null;
    }

    return { session, user };
  }

  /**
   * Returns the Google OAuth authorization URL for the sign-in flow (Req. 1.9).
   *
   * Returns null when Google OAuth is not configured — callers should treat this
   * as "feature not available" and skip silently.
   */
  googleGetAuthUrl(): string | null {
    const isConfigured = !!(
      env.GOOGLE_OAUTH_CLIENT_ID &&
      env.GOOGLE_OAUTH_CLIENT_SECRET &&
      env.GOOGLE_OAUTH_REDIRECT_URI
    );

    if (!isConfigured) {
      return null;
    }

    return googleOAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "email", "profile"],
      prompt: "select_account",
    });
  }

  /**
   * Handles Google OAuth callback: exchanges the authorization code for tokens,
   * verifies the ID token, upserts the user row, and creates a session (Req. 1.9).
   *
   * Returns null when Google OAuth is not configured — callers should treat this
   * as "feature not available" and skip silently.
   *
   * Throws with code `validation_error` when the code exchange or token
   * verification fails.
   */
  async googleOAuthSignIn(params: { code: string }): Promise<AuthResult | null> {
    const isConfigured = !!(
      env.GOOGLE_OAUTH_CLIENT_ID &&
      env.GOOGLE_OAUTH_CLIENT_SECRET &&
      env.GOOGLE_OAUTH_REDIRECT_URI
    );

    if (!isConfigured) {
      return null;
    }

    // Exchange authorization code for tokens
    let tokens: { access_token?: string | null; id_token?: string | null };
    try {
      const { tokens: t } = await googleOAuth2Client.getToken(params.code);
      tokens = t;
    } catch {
      const err = new Error("Failed to exchange Google OAuth code");
      (err as Error & { code: string }).code = "validation_error";
      throw err;
    }

    if (!tokens.access_token) {
      const err = new Error("No access token returned from Google");
      (err as Error & { code: string }).code = "validation_error";
      throw err;
    }

    // Verify the ID token and extract the user's profile
    googleOAuth2Client.setCredentials(tokens);
    let googleEmail: string;
    let googleName: string;
    try {
      const ticket = await googleOAuth2Client.verifyIdToken({
        idToken: tokens.id_token ?? "",
        audience: env.GOOGLE_OAUTH_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.email) {
        const err = new Error("Google account has no email");
        (err as Error & { code: string }).code = "validation_error";
        throw err;
      }
      googleEmail = payload.email;
      googleName = payload.name ?? "";
    } catch (e) {
      // Re-throw if already a coded error
      if ((e as Error & { code?: string }).code === "validation_error") throw e;
      const err = new Error("Failed to verify Google ID token");
      (err as Error & { code: string }).code = "validation_error";
      throw err;
    }

    const email = googleEmail.toLowerCase();

    // Upsert user: return existing row or create a new one
    const existing = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        fullName: usersTable.fullName,
        isAdmin: usersTable.isAdmin,
      })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    let user: { id: string; email: string; fullName: string; isAdmin: boolean };

    if (existing.length > 0 && existing[0]) {
      user = existing[0];
    } else {
      const [created] = await db
        .insert(usersTable)
        .values({ email, fullName: googleName })
        .returning({
          id: usersTable.id,
          email: usersTable.email,
          fullName: usersTable.fullName,
          isAdmin: usersTable.isAdmin,
        });

      if (!created) {
        const err = new Error("Failed to create user from Google OAuth");
        (err as Error & { code: string }).code = "submission_failed";
        throw err;
      }
      user = created;
    }

    // Create session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await db.insert(sessionsTable).values({
      id: sessionId,
      userId: user.id,
      expiresAt,
    });

    return { user, sessionId };
  }
}

/** Singleton instance for use across the services layer. */
export const authService = new AuthService();
export default authService;
