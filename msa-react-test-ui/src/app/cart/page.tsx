'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { money } from '@/lib/format';
import { useMarket } from '@/context/MarketProvider';

export default function CartPage() {
  const router = useRouter();
  const { cart, cartCount, cartTotal, currentUserName, login, changeQty, removeFromCart, checkout, busy, toast } = useMarket();
  const placeOrder = async () => {
    if (!login.userId) { router.push('/login?next=/cart'); return; }
    try {
      const ids = await checkout();
      router.push(ids.length ? '/monitor/kafka' : '/orders');
    } catch { /* provider handles */ }
  };
  return <section className="page-width cart-page route-section">
    {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    <div className="section-heading"><div><span className="section-kicker">SHOPPING CART</span><h1>장바구니 <b>{cartCount}</b></h1><p>페이지 이동 후에도 Context + sessionStorage로 장바구니가 유지됩니다.</p></div><Link className="refresh-button" href="/products">← 계속 쇼핑하기</Link></div>
    <div className="cart-page-grid">
      <div className="cart-page-list">{cart.length ? cart.map(item => <article className="cart-item cart-page-item" key={item.productId}><div className="cart-thumb">{item.productName.slice(0, 1).toUpperCase()}</div><div className="cart-product"><strong>{item.productName}</strong><small>{item.productId}</small><span>{money(item.unitPrice)}</span></div><div className="cart-qty"><button onClick={() => changeQty(item.productId, -1)}>−</button><strong>{item.qty}</strong><button onClick={() => changeQty(item.productId, 1)}>＋</button></div><strong className="cart-line-price">{money(item.unitPrice * item.qty)}</strong><button className="cart-remove" onClick={() => removeFromCart(item.productId)}>삭제</button></article>) : <div className="cart-empty cart-page-empty"><span>🛒</span><strong>장바구니가 비어 있습니다.</strong><small>상품을 담아 주문 흐름을 시작해보세요.</small><Link href="/products" className="primary-cta">상품 보러가기</Link></div>}</div>
      <aside className="cart-summary-panel"><span>ORDER SUMMARY</span><div><small>주문 사용자</small><strong>{currentUserName || '로그인 필요'}</strong></div><div><small>상품 수량</small><strong>{cartCount}개</strong></div><div className="cart-summary-total"><small>총 결제금액</small><strong>{money(cartTotal)}</strong></div><button className="checkout-button" disabled={!cart.length || busy} onClick={() => void placeOrder()}>{busy ? '처리 중...' : `${money(cartTotal)} 주문하기`}</button><p>주문 후 Kafka ORDER_CREATED 이벤트를 발행하고 Catalog Consumer가 재고를 비동기로 차감합니다.</p></aside>
    </div>
  </section>;
}
