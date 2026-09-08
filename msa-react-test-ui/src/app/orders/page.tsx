'use client';

import Link from 'next/link';
import OrderList from '@/components/order/OrderList';
import { money } from '@/lib/format';
import { useMarket } from '@/context/MarketProvider';

export default function OrdersPage() {
  const { orders, orderTotal, currentUserName, login, refreshOrders, busy } = useMarket();
  if (!login.userId) return <section className="page-width route-section login-required"><span>MY ORDERS</span><h1>로그인이 필요합니다.</h1><p>주문내역은 JWT 인증 사용자 기준으로 조회합니다.</p><Link className="primary-cta" href="/login?next=/orders">로그인</Link></section>;
  return <section className="order-section route-order-page"><div className="page-width">
    <div className="section-heading light"><div><span className="section-kicker">MY ORDERS</span><h1>최근 주문내역</h1><p>{currentUserName || '회원'}님의 Order Service 데이터입니다.</p></div><button className="refresh-button light-button" onClick={() => void refreshOrders()} disabled={busy}>↻ 주문 새로고침</button></div>
    <div className="order-summary-grid"><div className="summary-card"><small>주문 건수</small><strong>{orders.length}</strong><span>orders</span></div><div className="summary-card"><small>총 주문금액</small><strong>{money(orderTotal)}</strong><span>누적</span></div><div className="summary-card"><small>현재 사용자</small><strong className="summary-user">{currentUserName || '-'}</strong><span>User Service</span></div></div>
    <OrderList orders={orders} />
  </div></section>;
}
