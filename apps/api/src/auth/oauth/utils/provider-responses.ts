import { isEmail } from "class-validator";

import { isRecord } from "../../../common/utils/type-guards";
import { oauthError } from "../exceptions/oauth.exception";
import type { Identity } from "../oauth.providers";

export function verifiedEmail(email: unknown, verified: boolean): string {
  if (!verified || typeof email !== "string" || !isEmail(email)) throw oauthError("OAUTH_EMAIL_REQUIRED");
  return email;
}

export function parseKakaoToken(data: unknown): string {
  const token = isRecord(data) ? data.access_token : undefined;
  if (typeof token !== "string" || !token) throw oauthError();
  return token;
}

export function parseKakaoIdentity(json: string): Identity {
  const data: unknown = JSON.parse(json, (key, value, context?: { source: string }) =>
    key === "id" && typeof value === "number" ? context?.source : value,
  );
  if (!isRecord(data)) throw oauthError();
  if (typeof data.id !== "string" || !/^[1-9]\d*$/.test(data.id)) throw oauthError();
  const account = data.kakao_account;
  if (!isRecord(account)) throw oauthError("OAUTH_EMAIL_REQUIRED");
  return {
    id: data.id,
    email: verifiedEmail(account.email, account.is_email_valid === true && account.is_email_verified === true),
    nickname:
      isRecord(account.profile) && typeof account.profile.nickname === "string" ? account.profile.nickname : "player",
  };
}
