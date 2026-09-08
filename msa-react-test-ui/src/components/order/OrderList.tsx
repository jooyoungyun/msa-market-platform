'use client';

import { dateTime, money } from '@/lib/format';
import type { Order } from '@/types/api';

export default function OrderList({ orders }: { orders: Order[] }) {
  if (!orders.length) return <div className="empty-order"><strong>아직 주문내역이 없습니다.</strong><span>상품을 장바구니에 담아 첫 주문을 만들어보세요.</span></div>;
  return <div className="order-list">{orders.map((order, i) => <article className="order-card" key={order.orderId ?? i}>
    <div className="order-icon">◫</div>
    <div className="order-main"><div className="order-title"><strong>{order.productId}</strong><span>주문완료</span></div><p>{order.orderId ?? 'Order ID 생성됨'}</p><small>{dateTime(order.createdAt)}</small></div>
    <div className="order-qty"><small>수량</small><strong>{order.qty}</strong></div>
    <div className="order-price"><small>결제금액</small><strong>{money(order.totalPrice ?? order.unitPrice * order.qty)}</strong></div>
  </article>)}</div>;
}
