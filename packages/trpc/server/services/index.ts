import UserService from "@repo/services/user";
import { AuthService, AuthServiceStub, type IAuthService } from "@repo/services/auth";

export const userService = new UserService();

/**
 * Auth service singleton — uses the real AuthService backed by the database.
 * The stub is kept for tests that need to override session resolution.
 */
export let authService: IAuthService = new AuthService();

/**
 * Allows replacing the auth service singleton at startup (e.g. in tests).
 */
export function setAuthService(service: IAuthService): void {
  authService = service;
}

// Re-export stub for test use
export { AuthServiceStub };
