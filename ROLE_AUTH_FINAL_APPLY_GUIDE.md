# JWT Role / Ownership 최종 적용 가이드

이 패키지는 저장소 루트에 그대로 덮어쓰는 구조입니다.

## 핵심 변경

- Gateway JWT Role 인가: `AuthorizationHeaderFilter=ADMIN`
- Gateway 인증 헤더 강제 덮어쓰기: `X-Auth-User-Id`, `X-Auth-User-Role`
- 회원가입 Role 상승 차단: 서버에서 `ROLE_USER` 고정
- 관리자 초기 계정/기존 role NULL backfill
- User 상세 조회: 본인 또는 관리자만 허용
- Order 생성/사용자별 조회: 본인 또는 관리자만 허용
- User → Order Feign 조회용 내부 API 분리: `/order-service/internal/{userId}/orders`
- 일반 사용자의 `/user-service/users` 관리자 API 호출 제거
- 로그인 응답의 `role`, `userName` 저장
- Admin Route는 `authReady + isAdmin` 확인 후 접근
- 일반 사용자의 관리자 메뉴/홈 관리자 진입 카드 숨김
- User/Gateway JWT secret 기본값 통일 및 DB/Kafka 환경변수화
- README 실제 구현 상태와 정합성 수정
- `App.tsx` 주석 내 `*/` 오인식 가능성 제거

## 테스트 계정

- 일반 사용자: `test@test.com / test1234`
- 관리자: `admin@test.com / admin1234`

## 권장 확인 순서

1. MariaDB 기동
2. Eureka → Gateway → User → Catalog → Order 순서로 기동
3. 일반 사용자 로그인
   - `GET /api/user-service/users` → 403
   - 본인 `GET /api/order-service/{본인 userId}/orders` → 200
   - 다른 userId 주문 조회/생성 → 403
   - `/admin` 직접 접근 → `/` redirect
4. 관리자 로그인
   - `GET /api/user-service/users` → 200
   - 다른 사용자 상세/주문 조회 → 허용
   - 관리자 메뉴 표시
5. 비로그인
   - `POST /api/order-service/{userId}/orders` → 401
6. User 상세 조회 시 user-service → order-service Feign 호출이 정상인지 확인
7. Gateway와 User Service의 `JWT_SECRET`이 동일한지 확인

## 주의

하위 서비스 포트(9001/9002/9003)를 외부에 직접 공개하는 경우 Gateway를 우회할 수 있으므로, 운영 환경에서는 네트워크 레벨에서 직접 접근을 차단해야 합니다.
