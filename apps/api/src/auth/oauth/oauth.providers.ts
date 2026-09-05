import { createHash } from "node:crypto";

import type { OAuthProvider } from "@ax-chess/shared";
import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";

import { oauthError } from "./exceptions/oauth.exception";
import { parseKakaoIdentity, parseKakaoToken, verifiedEmail } from "./utils/provider-responses";

export interface OAuthSettings {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface Identity {
  id: string;
  email: string;
}

interface ProviderHandler {
  clientIdKey: string;
  authorizationUrl: (settings: OAuthSettings, state: string, codeVerifier: string) => string;
  identity: (settings: OAuthSettings, code: string, codeVerifier: string) => Promise<Identity>;
}

export const oauthProviders = new Map<OAuthProvider, ProviderHandler>([
  [
    "google",
    {
      clientIdKey: "GOOGLE_CLIENT_ID",
      authorizationUrl: (settings, state, codeVerifier) =>
        new OAuth2Client(settings.clientId, settings.clientSecret, settings.redirectUri).generateAuthUrl({
          scope: ["openid", "email"],
          state,
          code_challenge: createHash("sha256").update(codeVerifier).digest("base64url"),
          code_challenge_method: CodeChallengeMethod.S256,
          prompt: "select_account",
        }),
      identity: googleIdentity,
    },
  ],
  [
    "kakao",
    {
      clientIdKey: "KAKAO_REST_API_KEY",
      authorizationUrl: (settings, state) =>
        `https://kauth.kakao.com/oauth/authorize?${new URLSearchParams({
          client_id: settings.clientId,
          redirect_uri: settings.redirectUri,
          response_type: "code",
          scope: "account_email",
          state,
        })}`,
      identity: kakaoIdentity,
    },
  ],
]);

export function getOAuthProvider(provider: string): ProviderHandler {
  const handler = oauthProviders.get(provider as OAuthProvider);
  if (!handler) throw oauthError("OAUTH_DISABLED", 404);
  return handler;
}

async function googleIdentity(settings: OAuthSettings, code: string, codeVerifier: string): Promise<Identity> {
  const client = new OAuth2Client({
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    redirectUri: settings.redirectUri,
    transporterOptions: {
      timeout: 10_000,
      retry: false,
      retryConfig: { retry: 0 },
      signal: AbortSignal.timeout(20_000),
    },
  });
  const { tokens } = await client.getToken({ code, codeVerifier });
  if (!tokens.id_token) throw oauthError();
  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: settings.clientId });
  const payload = ticket.getPayload();
  if (!payload?.sub) throw oauthError();
  return {
    id: payload.sub,
    email: verifiedEmail(payload.email, payload.email_verified === true),
  };
}

async function kakaoIdentity(settings: OAuthSettings, code: string): Promise<Identity> {
  const response = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      redirect_uri: settings.redirectUri,
      code,
    }),
  });
  if (!response.ok) throw oauthError();
  const accessToken = parseKakaoToken(await response.json());
  const profile = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!profile.ok) throw oauthError();
  return parseKakaoIdentity(await profile.text());
}
