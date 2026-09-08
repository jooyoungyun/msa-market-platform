'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/admin', label: 'Dashboard', icon: '▦' },
  { href: '/admin/users', label: '사용자 관리', icon: '♙' },
  { href: '/admin/products', label: '상품 관리', icon: '◫' },
  { href: '/admin/orders', label: '주문 관리', icon: '◎' },
];

export default function AdminNav() {
  const path = usePathname();
  return <aside className="admin-sidebar next-admin-sidebar">
    {items.map(item => {
      const active = item.href === '/admin' ? path === '/admin' : path.startsWith(item.href);
      return <Link key={item.href} className={active ? 'active' : ''} href={item.href}><span>{item.icon}</span><div><strong>{item.label}</strong><small>{item.href}</small></div></Link>;
    })}
    <div className="admin-side-note"><strong>Next.js Route</strong><p>관리 기능을 각각 독립 페이지로 분리했습니다. 데이터 호출은 모두 Gateway :8000을 통과합니다.</p></div>
  </aside>;
}
