'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, toMessage } from '@/lib/api';
import { money } from '@/lib/format';
import type { AdminOrder } from '@/types/api';
import { useMarket } from '@/context/MarketProvider';

export default function AdminDashboard() {
  const { users, catalogs, refreshUsers, refreshCatalogs } = useMarket();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { void Promise.all([refreshUsers(), refreshCatalogs(), api.allOrders().then(setOrders)]).catch(e => setError(toMessage(e))); }, [refreshCatalogs, refreshUsers]);
  const sales = orders.reduce((sum, v) => sum + (v.totalPrice ?? v.unitPrice * v.qty), 0);
  const lowStock = catalogs.filter(v => v.stock <= 20).length;
  return <div>
    <div className="admin-toolbar"><div><strong>Admin Dashboard</strong><small>마이크로서비스 데이터 현황</small></div></div>
    {error && <div className="admin-error"><strong>API 오류</strong><pre>{error}</pre></div>}
    <div className="admin-stat-grid admin-stat-inner"><div><span>USERS</span><strong>{users.length}</strong><small>User Service</small></div><div><span>PRODUCTS</span><strong>{catalogs.length}</strong><small>Catalog Service</small></div><div><span>ORDERS</span><strong>{orders.length}</strong><small>Order Service</small></div><div><span>SALES</span><strong>{money(sales)}</strong><small>누적 주문금액</small></div><div><span>LOW STOCK</span><strong>{lowStock}</strong><small>재고 20 이하</small></div></div>
    <div className="admin-dashboard-links"><Link href="/admin/users"><strong>사용자 관리</strong><span>등록 · 수정 · 삭제 →</span></Link><Link href="/admin/products"><strong>상품 관리</strong><span>재고 · 가격 관리 →</span></Link><Link href="/admin/orders"><strong>주문 관리</strong><span>취소 · Kafka 재고복원 →</span></Link></div>
  </div>;
}
