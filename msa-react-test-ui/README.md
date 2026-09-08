# MSA Market - Next.js App Router

기존 Vite + React 단일 화면을 **Next.js 16 App Router** 기반 멀티 페이지 구조로 전환한 프론트엔드입니다.

## 주요 Route

| URL | 화면 |
|---|---|
| `/` | 쇼핑몰 홈 / 추천상품 / MSA 소개 |
| `/products` | 전체 상품 / 검색 / 재고 필터 |
| `/cart` | 장바구니 / 수량 변경 / 주문 |
| `/orders` | 로그인 사용자 주문내역 |
| `/login` | JWT 로그인 |
| `/admin` | 관리자 Dashboard |
| `/admin/users` | 사용자 관리 |
| `/admin/products` | 상품 관리 |
| `/admin/orders` | 주문 취소 + Kafka 재고복원 |
| `/monitor` | Gateway / 서비스 / JWT / API 로그 |
| `/monitor/kafka` | Kafka Producer → Broker → Consumer Flow |

## API 연결

브라우저는 각 마이크로서비스 포트를 직접 호출하지 않습니다.

```text
Next.js :3000
   ↓ /api/* rewrite
Spring Cloud Gateway :8000
   ↓ Eureka
User / Catalog / Order Service
```

`next.config.ts`의 rewrite가 `/api/:path*`를 `http://127.0.0.1:8000/:path*`로 전달합니다.

환경을 변경하려면 `.env.local` 파일을 만듭니다.

```env
GATEWAY_URL=http://127.0.0.1:8000
```

## 실행

Node.js 20.9 이상을 권장합니다.

```bash
npm install
npm run dev
```

접속:

```text
http://localhost:3000
```

## 권장 백엔드 실행 순서

1. MariaDB
2. Kafka
3. discoveryservice :8761
4. user-service :9001
5. catalog-service :9002
6. order-service :9003
7. apigateway-service :8000
8. Next.js :3000

## 상태 관리

페이지 전환 시에도 아래 상태가 유지되도록 `MarketProvider`를 사용합니다.

- JWT / 로그인 사용자
- 사용자명
- 장바구니
- 상품 / 주문
- Kafka 이벤트
- 서비스 Health
- 최근 API Debug Log

JWT, 사용자명, 장바구니, 최근 Kafka focus event는 `sessionStorage`에도 저장합니다.

## 관리자 권한

현재 백엔드 User 모델에 `ROLE_ADMIN`이 없으므로 Admin URL 자체는 접근 가능합니다. 다만 관리 API는 Gateway JWT 검증을 거칩니다. 다음 보안 고도화 단계에서 `USER / ADMIN` Role과 Route Guard를 추가하는 것을 권장합니다.

## Home page component structure

`src/app/page.tsx`는 App Router의 route entry 역할만 담당합니다. 실제 홈 화면은 `src/components/home/`으로 분리되어 있습니다.

```text
src/app/page.tsx
  └─ HomePage
      ├─ HeroSection
      ├─ ServiceTrustSection
      ├─ FeaturedProductsSection
      └─ FeatureNavigationSection
```

이 구조로 홈 화면의 섹션별 UI 수정과 테스트가 서로 독립적으로 가능해집니다.
