# PRD 02 — 세션 유지 및 Google / Kakao 로그인

| 항목 | 내용                                    |
| ---- | --------------------------------------- |
| 상태 | 구현 완료 후 운영 설정·실계정 검증 필요 |
| 순서 | Google 검증 후 Kakao 활성화             |
| 대상 | Next.js 웹 BFF, NestJS API, PostgreSQL  |

## 동작과 계정 정책

- 기존 access/refresh 세션의 발급·회전·절대 만료·로그아웃을 그대로 사용한다.
- Google과 Kakao는 authorization-code 방식으로 가입·로그인한다. Google은 PKCE와 공식 라이브러리의 ID-token 검증을 사용한다.
- 두 공급자 모두 인증된 이메일이 필요하다. Kakao는 `is_email_valid`와 `is_email_verified`가 모두 true여야 한다.
- 계정 식별자는 Google `sub` / Kakao `id`이다. 이미 연결된 식별자로 로그인하면 기존 사용자와 게임 기록을 그대로 사용하며 이메일·닉네임은 변경하지 않는다.
- 처음 보는 식별자와 사용되지 않은 이메일이면 10분짜리 가입 티켓을 HttpOnly 쿠키에 저장하고 `/sign-up/nickname`으로 이동한다. 이때 사용자와 세션은 생성하지 않는다.
- 닉네임은 한글·영문·숫자·밑줄 2–16자를 직접 입력한다. `auth/nickname/check`에서 중복을 확인하고, 가입 완료 시 DB unique 제약으로 다시 확인한다. 중복이면 같은 가입 티켓으로 다른 닉네임을 제출할 수 있다.
- 가입 완료 시 사용자와 OAuth 연결을 하나의 중첩 DB 쓰기로 생성하고 앱 세션을 발급한다. 만료되거나 가입에 사용한 티켓은 다시 사용할 수 없으며 임의 닉네임 생성과 자동 재시도는 하지 않는다.
- 이메일이 기존 사용자와 같아도 자동 연결하지 않는다. `ACCOUNT_LINK_REQUIRED` 안내를 표시하고 기존 로그인 방법으로 로그인한 뒤 프로필에서 명시적으로 연결한다.
- 비밀번호 계정은 연결 시작 시 현재 비밀번호를 다시 입력한다. 소셜 전용 계정은 기존 공급자로 로그인한 뒤 10분 이내에 연결한다. refresh로 발급한 access token은 최초 OAuth 인증 시각을 이어받으며, 10분 재인증 허용 기간을 연장하지 않는다.
- 연결 콜백은 현재 사용자, 공급자, state에 묶인 10분짜리 서명 티켓을 검증한다. 티켓 서명키는 access JWT 키와 별개이다.
- 연결 대상의 인증된 이메일은 현재 계정 이메일과 정확히 같아야 한다. 다른 사용자의 연결을 가져오거나 기존 연결을 교체하지 않는다. 기존 이메일 비교 정책을 유지하며 별도의 소문자 변환·이메일 마이그레이션은 하지 않는다.
- 공급자 이메일이 없거나 미검증이면 새 계정·연결·세션을 생성하지 않고 이메일 가입/로그인을 안내한다.

## 데이터 및 API

`User.passwordHash`는 nullable이다. 기존 비밀번호는 보존하고 소셜 전용 계정의 비밀번호 로그인은 기존 잘못된 자격 증명 응답을 반환한다.

`oauth_accounts`: `id`, `user_id`, `provider`, `provider_account_id`, `created_at`.
공급자는 google/kakao로 제한하며 `(provider, provider_account_id)`와 `(user_id, provider)`에 unique 제약을 둔다.

`:provider`는 google 또는 kakao이다.

| 메서드 | 경로                               | 동작                                           |
| ------ | ---------------------------------- | ---------------------------------------------- |
| GET    | /api/auth/oauth/providers          | 활성 공급자 목록; 설정 전에는 빈 목록          |
| GET    | /api/auth/oauth/:provider          | state 쿠키 설정 후 공급자로 이동               |
| GET    | /api/auth/oauth/:provider/callback | state 검증 후 로그인/연결 완료                 |
| POST   | /api/auth/oauth/:provider/link     | 프로필의 명시적 연결 시작; 동일 origin 필수    |
| GET    | /auth/oauth/providers              | BFF 전용 공급자 목록                           |
| POST   | /auth/oauth/:provider/start        | BFF 전용 인가 URL 생성                         |
| POST   | /auth/oauth/:provider/link/start   | BFF + 사용자 JWT; 재인증 후 연결 티켓 생성     |
| POST   | /auth/oauth/:provider/callback     | 기존 회원 토큰 발급 / 신규 회원 가입 티켓 발급 |
| POST   | /auth/nickname/check               | 공통 닉네임 형식·중복 확인                     |
| POST   | /api/auth/oauth/signup             | 동일 origin·가입 쿠키 확인 후 가입 완료        |
| POST   | /auth/oauth/signup                 | BFF 전용 가입 티켓 검증·사용자 생성·토큰 발급  |
| POST   | /auth/oauth/:provider/link         | BFF + 사용자 JWT; 티켓 검증 및 연결            |
| GET    | /auth/me                           | 기존 프로필 + hasPassword, connectedProviders  |

로그인 내부 응답은 기존 `accessToken`, `accessExpiresAt`, `refreshToken`, `refreshExpiresAt`, `user` 형식이다. 브라우저에는 토큰 본문 대신 HTTP-only 쿠키만 전달한다. 연결 성공은 `{ linked: true }`이며 새 로그인 세션을 발급하지 않는다.

## 브라우저 및 보안

- 로그인·가입 화면에 활성화된 Google/Kakao 버튼을 표시한다. 프로필에서는 연결 상태와 연결 폼을 표시한다.
- 공급자별 state 쿠키는 난수 state, PKCE verifier, 만료, 선택적인 연결 티켓을 포함한다. HMAC으로 서명하고 10분 뒤 만료시킨다.
- 쿠키는 HttpOnly, SameSite=Lax, Path=/이며 운영에서는 Secure와 state 쿠키의 __Host- 접두어를 사용한다.
- state 검증은 API 호출보다 먼저 수행한다. 콜백은 성공·실패 모두 임시 쿠키를 삭제한다. 동시에 같은 공급자를 시작하면 가장 최근 흐름만 유효하다.
- 공급자 거부 응답에 state가 없다면 검증 실패로 로그인 화면에 돌아간다. 기존 앱 세션 쿠키는 삭제하지 않는다.
- OAuth API는 `x-oauth-bff-secret`을 요구한다. 일반 웹 catch-all 프록시는 OAuth 경로를 차단하고 해당 헤더를 전달하지 않는다.
- 연결 POST는 WEB_URL과 Origin이 일치해야 한다. 연결 도중 access 만료 시 기존 refresh 세션으로 한 번 갱신하며, 갱신 쿠키는 연결 실패 시에도 보존한다.
- 성공 위치는 로그인 `/`, 연결 `/profile?linked=1`로 고정한다. 오류는 알려진 코드로만 전달하며 기존 세션 또는 연결 흐름이면 프로필, 그 외에는 로그인 화면에 표시한다. 소셜 전용 계정은 프로필의 연결된 공급자 옆에서 다시 인증할 수 있다.
- 공급자 요청에는 timeout을 적용한다. 공급자 토큰은 저장하지 않고 로그에는 공급자·결과 코드·소요 시간만 남긴다.
- 애플리케이션 로그와 외부 프록시/분석 설정에서도 콜백 쿼리 문자열, 토큰, 쿠키, 비밀번호, code를 기록하지 않는다.
- 공급자 전체 로그아웃, 연결 해제, 계정 병합, 비밀번호 재설정, Kakao JavaScript SDK는 이번 범위에서 제외한다.

## 환경 설정 및 배포

1. `.env.example`의 OAuth 항목을 설정한다. 웹은 `API_URL`, `WEB_URL`, `OAUTH_BFF_SECRET`이 필요하다. API는 아래 공급자 설정과 같은 WEB_URL/BFF secret을 사용한다. Docker Compose는 루트 `.env`에서 전달한다. Docker 없이 실행할 때는 웹의 세 변수를 `apps/web/.env.local` 또는 실행 환경에 설정한다.
2. `OAUTH_BFF_SECRET`은 JWT_SECRET과 다른 32자 이상의 난수로 생성한다. 어느 secret도 NEXT_PUBLIC 변수로 노출하지 않는다.
3. Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`를 설정하고 웹 앱 OAuth 클라이언트 및 동의 화면을 준비한다. scope는 openid/email이다.
4. Kakao: 로그인 활성화, REST API 키, 활성 client secret, account_email 동의 항목을 준비한다. `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `KAKAO_REDIRECT_URI`를 설정한다. 이메일 동의 권한이 사용 가능해야 한다.
5. 각 콘솔에 정확한 `WEB_URL/api/auth/oauth/{google|kakao}/callback`을 등록한다. WEB_URL은 경로 없는 origin이며 운영은 HTTPS이다. 로컬 Docker 포트를 바꾸면 WEB_URL과 두 redirect URI도 맞춘다.
6. 운영에 migration을 먼저 적용한다: `pnpm --filter api exec prisma migrate deploy`. 기존 데이터 삭제나 백필은 없다. Prisma client를 생성한 API와 웹을 배포한다.
7. 기본값은 `GOOGLE_OAUTH_ENABLED=false`, `KAKAO_OAUTH_ENABLED=false`이다. Google부터 true로 바꾸고 아래 수동 검증을 끝낸 다음 Kakao를 활성화한다. 활성 공급자의 설정 누락·잘못된 redirect URI는 API 시작 시 오류로 처리한다.
8. 문제 발생 시 해당 enabled 값을 false로 되돌리고 API를 재시작한다. DB 연결 정보와 사용자는 유지한다. 이미 발급된 앱 세션은 기존 만료/로그아웃 정책을 따른다.

## 검증

자동 검증:

- `pnpm --filter api test -- --runInBand`
- `pnpm --filter web test`
- `pnpm typecheck`, `pnpm lint`, `pnpm build`
- OAuth state 누락·변조·만료·공급자 불일치, 거부, malformed 응답, 쿠키 비노출, 연결 Origin 검사와 refresh 재시도.
- 신규·재방문 사용자, 검증 이메일 정책, 이메일 충돌, 닉네임/동시 가입 충돌, 재인증, 티켓 사용자/공급자/state 바인딩, 연결 소유권 충돌, Google 검증기와 Kakao 64-bit 식별자.
- BFF credential 없는 직접 호출, 사용자 JWT 없는 연결, 잘못된 code 입력 차단.

Google부터 실제 콘솔 설정과 브라우저에서 다음을 확인한 뒤 Kakao에 반복한다:

- 신규 OAuth 인증 → 닉네임 입력 → 중복 확인(중복·수정 포함) → 가입 완료 → 홈 → 프로필 → 로그아웃 → 재로그인.
- 닉네임 입력 전에는 사용자·세션이 생성되지 않으며, 가입 티켓 만료 시 다시 로그인한다.
- 기존 이메일 계정의 동일 이메일은 연결 안내 → 비밀번호 로그인 → 프로필 연결 → 소셜 재로그인으로 기존 게임 기록 유지.
- 소셜 전용 계정에 두 번째 공급자 연결; 오래된 재인증은 안내 후 재로그인.
- 동의 취소, 이메일 거부/미검증, 연결 이메일 불일치, 휴대폰 화면에서 버튼과 오류 문구.
- access 만료 후 refresh, 로그아웃 후 refresh 거부, 운영 Secure/HttpOnly 쿠키 및 로그에 민감정보가 없는지 확인.

## 참고

- [Google Auth Library](https://github.com/googleapis/google-auth-library-nodejs)
- [Kakao Login REST API](https://developers.kakao.com/docs/en/kakaologin/rest-api)
