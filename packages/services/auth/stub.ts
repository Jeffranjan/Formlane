import type { IAuthService, ResolvedSession, AuthResult } from "./interface";

/**
 * No-op stub for IAuthService used in tests or when the real AuthService is unavailable.
 * All methods throw or return null — not suitable for production use.
 */
export class AuthServiceStub implements IAuthService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async signUp(_params: { email: string; password: string; fullName?: string }): Promise<AuthResult> {
    throw new Error("AuthServiceStub: signUp not implemented");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async signIn(_params: { email: string; password: string }): Promise<AuthResult> {
    throw new Error("AuthServiceStub: signIn not implemented");
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async signOut(_sessionId: string): Promise<void> {
    // no-op
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async resolveSession(_sessionId: string): Promise<ResolvedSession | null> {
    return null;
  }

  googleGetAuthUrl(): string | null {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async googleOAuthSignIn(_params: { code: string }): Promise<AuthResult | null> {
    return null;
  }
}
