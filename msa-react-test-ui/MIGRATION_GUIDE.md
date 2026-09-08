# Vite → Next.js 전환 요약

## 변경 전

```text
App.tsx
 ├─ 쇼핑몰
 ├─ 관리자
 ├─ Kafka Monitor
 └─ System Monitor
```

상태 변수 `page = shop | admin | monitor`로 화면을 바꾸는 SPA 방식이었습니다.

## 변경 후

```text
src/app/
 ├─ page.tsx
 ├─ products/page.tsx
 ├─ cart/page.tsx
 ├─ orders/page.tsx
 ├─ login/page.tsx
 ├─ admin/
 │   ├─ page.tsx
 │   ├─ users/page.tsx
 │   ├─ products/page.tsx
 │   └─ orders/page.tsx
 └─ monitor/
     ├─ page.tsx
     └─ kafka/page.tsx
```

Next.js `Link`와 App Router가 실제 URL Navigation을 담당합니다.

## 공통 컴포넌트

- `components/layout/Header.tsx`
- `components/layout/Footer.tsx`
- `components/product/ProductCard.tsx`
- `components/product/ProductGrid.tsx`
- `components/order/OrderList.tsx`
- `components/admin/AdminNav.tsx`
- `components/monitor/KafkaFlow.tsx`
- `components/monitor/SystemOverview.tsx`

## 공통 상태

`context/MarketProvider.tsx`

페이지 이동 때문에 사라지면 안 되는 장바구니, 인증, Kafka 상태를 Context에서 관리합니다.
