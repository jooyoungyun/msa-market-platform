'use client';

import Link from 'next/link';
import { money } from '@/lib/format';
import { useMarket } from '@/context/MarketProvider';
import type { Catalog } from '@/types/api';

export default function ProductCard({ product, index = 0 }: { product: Catalog; index?: number }) {
  const { cart, addToCart, changeQty, busy } = useMarket();
  const cartItem = cart.find(item => item.productId === product.productId);
  return <article className="product-card">
    <div className={`product-image image-${index % 6}`}>
      <span className="product-badge">{product.stock <= 20 ? 'LOW STOCK' : 'NEW'}</span>
      <div className="product-symbol">{product.productName.slice(0, 1).toUpperCase()}</div>
      <small>{product.productId}</small>
    </div>
    <div className="product-info">
      <div className="product-meta"><span>MSA MARKET</span><span className={product.stock > 0 ? 'stock' : 'stock soldout'}>{product.stock > 0 ? `재고 ${product.stock}` : '품절'}</span></div>
      <h3>{product.productName}</h3>
      <p className="product-code">{product.productId}</p>
      <div className="price-row"><strong>{money(product.unitPrice)}</strong><small>무료배송</small></div>
      {cartItem ? <div className="qty-control">
        <button onClick={() => changeQty(product.productId, -1)}>−</button><strong>{cartItem.qty}</strong><button onClick={() => changeQty(product.productId, 1)}>＋</button>
        <Link className="cart-inline" href="/cart">장바구니 보기</Link>
      </div> : <button className="add-cart" disabled={product.stock <= 0 || busy} onClick={() => addToCart(product)}><span>🛒</span> 장바구니 담기</button>}
    </div>
  </article>;
}
