import { env } from "../env";
import { googleOAuth2Client } from "../clients/google-oauth";

export interface AuthenticationMethod {
  provider: "GOOGLE_OAUTH";
  displayName: string;
  displayText: string;
  authUrl: string;
}

class UserService {
  public async getAuthenticationMethods(): Promise<readonly AuthenticationMethod[]> {
    const methods: AuthenticationMethod[] = [];

    const isGoogleConfigured = !!(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET);

    if (isGoogleConfigured) {
      const url = googleOAuth2Client.generateAuthUrl();
      methods.push({
        provider: "GOOGLE_OAUTH",
        displayName: "Google",
        displayText: "Signin with Google",
        authUrl: url,
      });
    }

    return methods;
  }
}

export default UserService;
