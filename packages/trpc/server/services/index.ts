import { AuthService, AuthServiceStub, type IAuthService } from "@repo/services/auth";

export let authService: IAuthService = new AuthService();

export function setAuthService(service: IAuthService): void {
  authService = service;
}

export { AuthServiceStub };
