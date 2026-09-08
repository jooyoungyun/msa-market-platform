'use client';

import AdminNav from '@/components/admin/AdminNav';
import { useMarket } from '@/context/MarketProvider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { login } = useMarket();
  return <section className="admin-page page-width route-section">
    <div className="admin-page-head"><div><span className="admin-eyebrow">ADMIN CONSOLE</span><h1>서비스 데이터 관리</h1><p>User · Catalog · Order 데이터를 독립 Next.js Route로 관리합니다.</p></div><span className={login.userId ? 'admin-session online' : 'admin-session'}>● {login.userId ? 'JWT SESSION' : '로그인 필요'}</span></div>
    {!login.userId && <div className="admin-warning">관리 API는 Gateway JWT 인증이 필요합니다. 먼저 로그인하세요.</div>}
    <div className="admin-workspace next-admin-workspace"><AdminNav /><div className="admin-content next-admin-content">{children}</div></div>
  </section>;
}
