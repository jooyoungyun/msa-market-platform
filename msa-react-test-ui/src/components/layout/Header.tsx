'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMarket } from '@/context/MarketProvider';

const nav = [
  { href: '/', label: '홈' },
  { href: '/products', label: '상품' },
  { href: '/orders', label: '내 주문' },
  { href: '/admin', label: '관리자' },
  { href: '/monitor', label: 'System Monitor' },
];

export default function Header() {
  const pathname = usePathname();
  const { cartCount, login, currentUserName, isAdmin, logout } = useMarket();
  const active = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return <>
    <div className="top-strip">
      <div className="page-width top-strip-inner">
        <span>Spring Cloud MSA Demo Store · Next.js App Router</span>
        <div className="app-nav">
          {nav.filter(item => item.href !== '/admin' || isAdmin).map(item => <Link key={item.href} className={active(item.href) ? 'link-button active' : 'link-button'} href={item.href}>{item.label}</Link>)}
        </div>
      </div>
    </div>
    <header className="store-header">
      <div className="page-width header-inner">
        <Link className="brand" href="/">
          <span className="brand-mark">M</span>
          <span><strong>MSA MARKET</strong><small>microservice commerce</small></span>
        </Link>
        <div className="next-route-title">
          <small>NEXT.JS NAVIGATION</small>
          <strong>{routeTitle(pathname)}</strong>
        </div>
        <nav className="header-actions">
          {login.userId ? <div className="account-chip">
            <span className="avatar">{(currentUserName || '회원').slice(0, 1).toUpperCase()}</span>
            <div><small>로그인</small><strong>{currentUserName || '회원'}</strong></div>
            <button className="icon-button" onClick={logout} title="로그아웃">↪</button>
          </div> : <Link className="account-button" href="/login"><span>♙</span> 로그인</Link>}
          <Link className="cart-button" href="/cart"><span>🛒</span><span>장바구니</span><b>{cartCount}</b></Link>
        </nav>
      </div>
    </header>
  </>;
}

function routeTitle(pathname: string) {
  if (pathname.startsWith('/admin/users')) return '사용자 관리';
  if (pathname.startsWith('/admin/products')) return '상품 관리';
  if (pathname.startsWith('/admin/orders')) return '주문 관리';
  if (pathname.startsWith('/admin')) return 'Admin Dashboard';
  if (pathname.startsWith('/monitor/kafka')) return 'Kafka Live Flow';
  if (pathname.startsWith('/monitor')) return '서비스 · 로그 모니터링';
  if (pathname.startsWith('/products')) return '상품 카탈로그';
  if (pathname.startsWith('/cart')) return '장바구니';
  if (pathname.startsWith('/orders')) return '내 주문내역';
  if (pathname.startsWith('/login')) return '로그인';
  return 'MSA 쇼핑몰';
}
