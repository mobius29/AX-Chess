# PRD 02 — 세션 유지 및 소셜 로그인

| 항목 | 내용 |
| --- | --- |
| 상태 | Draft |
| 우선순위 | Google OAuth: 필수 / Kakao OAuth: 조건부 |
| 대상 | AX-Chess 웹(`apps/web`), API(`apps/api`), PostgreSQL |

## 1. 배경과 목표

현재 로그인은 이메일/비밀번호로 발급한 단일 JWT를 `accessToken` HTTP-only 쿠키에 7일간 보관한다. 만료 전 세션을 연장할 수 없고, Google 계정 사용자는 별도 가입 절차를 거쳐야 한다.

이번 릴리스의 목표는 다음 두 가지다.

1. 사용자가 활동 중이면 재로그인 없이 세션을 안전하게 연장한다.
2. Google 계정으로 가입·로그인할 수 있게 한다.

Kakao 로그인은 Google 완료 뒤, 카카오 디벨로퍼스 앱·동의 항목·운영 Redirect URI가 준비된 경우에만 같은 릴리스에 포함한다.

## 2. 범위

### 포함

- 짧은 수명의 access token과 회전형 refresh token
- 로그인, Google OAuth 완료, refresh 성공 시 두 토큰 발급
- 로그아웃 시 refresh 세션 폐기 및 두 쿠키 삭제
- Google OAuth 2.0 authorization-code 로그인
- 동일한 **검증된 이메일**의 기존 이메일 계정 연결
- OAuth 최초 가입자의 닉네임 자동 생성
- 만료·취소·오류 시 로그인 화면으로 복귀하는 UX

### 제외

- 여러 기기 세션 목록/원격 로그아웃
- 비밀번호 재설정, 이메일 인증
- Google API 접근 또는 Google refresh token 저장
- Kakao를 위한 별도 UI/추상화 선구현

## 3. 사용자 흐름

### 3.1 이메일 로그인과 세션 갱신

1. 사용자가 이메일/비밀번호로 로그인한다.
2. 웹 프록시는 `accessToken`(15분)과 `refreshToken`(30일)을 HTTP-only 쿠키로 설정한다.
3. API 요청이 401이면 클라이언트는 `POST /api/auth/refresh`를 한 번만 호출한다.
4. 갱신 성공 시 원 요청을 한 번 재시도한다. 갱신 또는 재시도가 실패하면 쿠키를 삭제하고 `/login`으로 이동한다.
5. 로그아웃은 refresh 세션을 폐기하고 두 쿠키를 삭제한다.

동시 401 요청은 브라우저 탭 안에서 하나의 refresh 요청만 수행한다. refresh 요청 자체는 재시도하지 않는다.

### 3.2 Google 로그인

1. 로그인 화면에서 `Google로 계속하기`를 누른다.
2. 웹 BFF는 암호학적으로 안전한 `state`를 짧은 수명 HTTP-only 쿠키에 저장한 뒤 Google 동의 화면으로 리디렉션한다.
3. Google은 웹 BFF 콜백으로 `code`와 `state`를 돌려준다. BFF는 state를 검증·삭제하고 authorization code를 API에 서버 간 전달한다.
4. API는 code를 서버에서 교환한 뒤 Google `sub`와 검증된 이메일로 사용자를 찾는다.
   - 기존 Google 연결이 있으면 해당 사용자로 로그인한다.
   - 연결은 없지만 검증된 이메일의 기존 계정이 있으면 그 계정에 Google 연결을 추가한다.
   - 둘 다 없으면 새 사용자를 만들고, Google 표시 이름을 기준으로 고유한 닉네임을 생성한다.
5. API는 로그인 결과를 BFF에만 전달한다. BFF가 AX-Chess의 access/refresh 쿠키를 설정한 뒤 홈으로 리디렉션한다.

사용자가 Google 동의를 거부하거나 콜백 검증·토큰 교환에 실패하면 토큰을 발급하지 않고 `/login?error=oauth_failed`로 돌아간다.

## 4. 기능 요구사항

### FR-1. 토큰 및 세션

- Access token은 현재 JWT payload(`sub`, `email`)를 유지하고 만료 시간은 15분이다.
- Refresh token은 JWT가 아닌 충분히 긴 난수 문자열이다. 서버는 원문을 저장하거나 로그에 남기지 않고 해시만 저장한다.
- refresh 성공 시 기존 refresh token은 즉시 폐기하고 새 access/refresh token 쌍을 발급한다.
- refresh token의 절대 만료는 발급 시점부터 30일이다. 활동한다고 30일 창을 무한 연장하지 않는다.
- 만료·폐기·알 수 없는 refresh token은 모두 `401 UNAUTHORIZED`로 응답한다. 사용자 존재 여부나 토큰 상태는 노출하지 않는다.
- 로그아웃은 현재 refresh 세션만 폐기한다.

### FR-2. 쿠키와 프록시

- 두 쿠키 모두 `HttpOnly`, `Secure`(production), `SameSite=Lax`, `Path=/`를 사용한다.
- JavaScript와 API 응답 본문에는 refresh token을 노출하지 않는다.
- Next.js 프록시는 access token만 Bearer 헤더로 API에 전달한다. refresh endpoint만 refresh cookie를 서버 간 요청으로 전달한다.
- 현재 `auth/login` 전용 쿠키 설정 로직은 OAuth 완료와 `auth/refresh`에도 공통 적용한다.

### FR-3. Google OAuth

- 흐름은 authorization-code 방식이며, API가 client secret과 code 교환을 담당한다.
- 인가 요청은 `response_type=code`, 등록된 `redirect_uri`, 최소 권한 `openid email profile`, 암호학적으로 안전한 `state`를 사용한다.
- BFF 콜백은 HTTP-only state cookie와 일치할 때만 code를 API에 전달하고 즉시 state cookie를 삭제한다. provider ID는 이메일이 아니라 Google `sub`를 식별자로 저장한다.
- API는 교환받은 ID token의 서명, `iss`, `aud`, `exp`를 검증한 뒤에만 `sub`, `email`, `email_verified`를 신뢰한다.
- 이메일로 기존 계정을 연결하는 경우에는 Google이 `email_verified=true`를 보장한 경우만 허용한다.
- OAuth 로그인은 기존 이메일/비밀번호 로그인을 제거하거나 비밀번호를 변경하지 않는다.

### FR-4. Kakao (조건부)

Google의 모든 인수 기준을 통과하고 아래 선행 조건이 배포 전 충족되면, 같은 `OAuthAccount` 저장 구조에 `provider=kakao`만 추가한다.

- 카카오 디벨로퍼스 앱, REST API 키, client secret(사용 시), 운영 도메인과 Redirect URI가 등록되어 있다.
- 카카오 로그인 동의 항목에서 계정 식별자와 필요한 프로필 정보가 사용 가능하다.
- 이메일이 없거나 미검증인 Kakao 계정은 기존 계정에 자동 연결하지 않는다. 새 계정도 만들지 않고 이메일 로그인 안내를 표시한다.

조건 중 하나라도 미충족이면 Kakao 버튼·endpoint·환경변수는 이번 릴리스에 추가하지 않는다.

## 5. 데이터 모델과 API 계약

### 데이터 모델

`User.passwordHash`는 nullable로 변경한다. OAuth 전용 사용자는 비밀번호 해시를 갖지 않는다.

| 테이블 | 필수 필드/제약 |
| --- | --- |
| `oauth_accounts` | `id`, `user_id`, `provider`, `provider_account_id`, `created_at`; `@@unique([provider, providerAccountId])` |
| `refresh_sessions` | `id`, `user_id`, `token_hash`(unique), `expires_at`, `revoked_at`, `created_at`; `token_hash` 원문 저장 금지 |

기존 `users` 데이터는 보존한다. 이메일 계정의 `passwordHash`는 그대로 유지한다.
비밀번호 해시가 없는 OAuth 전용 계정에 이메일 로그인 요청이 오면 계정 존재를 드러내지 않는 기존의 잘못된 자격 증명 응답을 반환한다.

### API

| 메서드 | 경로 | 동작 |
| --- | --- | --- |
| `POST` | `/auth/login` | access/refresh token 쌍 발급 |
| `POST` | `/auth/refresh` | 유효한 refresh token을 회전하고 token 쌍 발급 |
| `POST` | `/auth/logout` | 현재 refresh 세션 폐기 |
| `POST` | `/auth/oauth/google/callback` | BFF가 전달한 code를 교환하고 사용자 연결 후 token 쌍 반환 |
| `GET` | `/api/auth/oauth/google` | 웹 BFF: state cookie 설정 후 Google 인가 화면으로 리디렉션 |
| `GET` | `/api/auth/oauth/google/callback` | 웹 BFF: state 검증, API 호출, AX-Chess 쿠키 설정 후 홈으로 리디렉션 |

토큰 발급 API의 API→웹 내부 응답에는 `accessToken`, `refreshToken`, `user`가 포함될 수 있으나, 웹→브라우저 응답은 `user`만 반환하고 토큰은 쿠키로만 설정한다.

## 6. UX 및 오류 문구

- 로그인 화면: 이메일 로그인 아래에 구분선과 `Google로 계속하기` 버튼을 배치한다.
- OAuth 취소/실패: `Google 로그인에 실패했습니다. 다시 시도해 주세요.`
- 세션 만료: `세션이 만료되었습니다. 다시 로그인해 주세요.` 후 로그인 화면으로 이동한다.
- Kakao 버튼은 조건부 범위가 확정되기 전에는 표시하지 않는다.

## 7. 환경변수와 운영 준비

```env
JWT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
WEB_URL=
# Kakao 확정 시에만 추가
KAKAO_REST_API_KEY=
KAKAO_CLIENT_SECRET=
KAKAO_REDIRECT_URI=
```

- 운영 Redirect URI는 `WEB_URL/api/auth/oauth/google/callback`이며 Google Cloud Console 등록값과 정확히 일치해야 한다.
- client secret과 refresh token 원문은 로그, 오류 응답, 분석 도구에 남기지 않는다.
- OAuth 콜백은 HTTPS에서만 운영한다.

## 8. 인수 기준

- [ ] 이메일 로그인 후 access token이 만료되면 유효한 refresh token으로 1회 갱신되어 원 요청이 성공한다.
- [ ] refresh token 재사용·만료·로그아웃 후에는 401이며 새 토큰이 발급되지 않는다.
- [ ] 로그아웃 후 두 쿠키가 삭제되고 동일 세션으로 refresh할 수 없다.
- [ ] Google 신규 사용자는 최초 로그인 한 번으로 홈에 도달하고 고유 닉네임을 갖는다.
- [ ] 기존 이메일 계정은 검증된 동일 Google 이메일로 로그인해도 기존 게임 기록을 유지한다.
- [ ] `state` 불일치, OAuth 거부, code 교환 실패는 계정 생성·토큰 발급 없이 로그인 화면에 오류를 표시한다.
- [ ] access/refresh token 원문이 DB·API 브라우저 응답·애플리케이션 로그에 없다.
- [ ] Kakao는 선행 조건을 모두 충족한 경우에만 위와 동등한 테스트를 통과한다.

## 9. 구현 순서

1. Prisma migration: `passwordHash` nullable, `oauth_accounts`, `refresh_sessions`.
2. API: token 발급/회전/폐기와 refresh endpoint, 단위·e2e 테스트.
3. 웹 프록시와 API client: 두 쿠키 설정, 401 단일 refresh 후 1회 재시도, 로그아웃 반영.
4. Google OAuth endpoint·콜백·로그인 버튼과 성공/실패 경로 테스트.
5. Kakao 선행 조건 확인 후에만 4의 provider 추가.

## 10. 참고

- Google OAuth 2.0 Web Server Applications: https://developers.google.com/identity/protocols/oauth2/web-server
