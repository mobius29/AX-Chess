import type { OAuthProvider } from "@ax-chess/shared";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { oauthError } from "../auth/oauth/exceptions/oauth.exception";
import { oauthProviders } from "../auth/oauth/oauth.providers";
import type { OAuthSettings } from "../auth/oauth/oauth.providers";
import { isValidWebOrigin } from "../auth/oauth/utils/validation";

@Injectable()
export class OAuthConfigService {
  private readonly enabled = new Map<OAuthProvider, OAuthSettings>();

  constructor(config: ConfigService) {
    const providers = [...oauthProviders].filter(
      ([provider]) => config.get(`${provider.toUpperCase()}_OAUTH_ENABLED`) === "true",
    );
    if (!providers.length) return;
    const required = (name: string) => {
      const value = config.get<string>(name)?.trim();
      if (!value) throw new Error(`${name} is required when OAuth is enabled.`);
      return value;
    };
    const web = new URL(required("WEB_URL"));
    const requiresHttps = config.get("NODE_ENV") === "production";
    if (!isValidWebOrigin(web, requiresHttps)) {
      throw new Error("WEB_URL must be an origin (HTTPS in production).");
    }
    const secret = required("OAUTH_BFF_SECRET");
    if (secret.length < 32 || config.get("OAUTH_BFF_SECRET") === config.get("JWT_SECRET")) {
      throw new Error("OAUTH_BFF_SECRET must have at least 32 characters and differ from JWT_SECRET.");
    }
    for (const [provider, handler] of providers) {
      const prefix = provider.toUpperCase();
      const redirectUri = required(`${prefix}_REDIRECT_URI`);
      if (redirectUri !== `${web.origin}/api/auth/oauth/${provider}/callback`) {
        throw new Error(`${prefix}_REDIRECT_URI must match WEB_URL and the provider callback path.`);
      }
      this.enabled.set(provider, {
        clientId: required(handler.clientIdKey),
        clientSecret: required(`${prefix}_CLIENT_SECRET`),
        redirectUri,
      });
    }
  }

  providers(): OAuthProvider[] {
    return [...this.enabled.keys()];
  }

  settings(provider: string): OAuthSettings {
    const settings = this.enabled.get(provider as OAuthProvider);
    if (!settings) throw oauthError("OAUTH_DISABLED", 404);
    return settings;
  }
}
