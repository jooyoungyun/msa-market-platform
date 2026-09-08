'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '@/components/admin/AdminNav';
import { useMarket } from '@/context/MarketProvider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { login, authReady, isAdmin } = useMarket();

  useEffect(() => {
    if (authReady && !isAdmin) router.replace('/');
  }, [authReady, isAdmin, router]);

  if (!authReady) {
    return <section className="admin-page page-width route-section"><div className="admin-warning">인증 정보를 확인하고 있습니다.</div></section>;
  }
  if (!isAdmin) return null;

  return <section className="admin-page page-width route-section">
    <div className="admin-page-head"><div><span className="admin-eyebrow">ADMIN CONSOLE</span><h1>서비스 데이터 관리</h1><p>User · Catalog · Order 데이터를 독립 Next.js Route로 관리합니다.</p></div><span className="admin-session online">● JWT ADMIN SESSION · {login.userName || '관리자'}</span></div>
    <div className="admin-workspace next-admin-workspace"><AdminNav /><div className="admin-content next-admin-content">{children}</div></div>
  </section>;
}
