'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, toMessage } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import { useMarket } from '@/context/MarketProvider';
import type { AdminOrder } from '@/types/api';

export default function AdminOrdersPage() {
  const { setFocusedKafkaEventId, refreshKafkaEvents, refreshCatalogs, setApiLog, login } = useMarket();
  const [orders,setOrders]=useState<AdminOrder[]>([]);const[query,setQuery]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState('');const[lastEvent,setLastEvent]=useState('');
  const refresh=async()=>{try{setOrders(await api.allOrders());}catch(e){setError(toMessage(e));}};
  useEffect(()=>{if(login.userId)void refresh();},[login.userId]);
  const filtered=useMemo(()=>orders.filter(v=>!query.trim()||`${v.orderId} ${v.userId} ${v.productId}`.toLowerCase().includes(query.toLowerCase())),[orders,query]);
  const cancel=async(order:AdminOrder)=>{if(!window.confirm(`${order.orderId} 주문을 취소/삭제할까요?\nKafka ORDER_CANCELLED 이벤트로 재고 ${order.qty}개를 복원합니다.`))return;setBusy(true);try{const eventId=await api.deleteOrder(order.orderId);if(eventId){setLastEvent(eventId);setFocusedKafkaEventId(eventId);for(let i=0;i<12;i+=1){const events=await api.kafkaEvents(150);if(events.some(v=>v.eventId===eventId&&(v.stage==='INVENTORY_RESTORED'||v.status==='ERROR')))break;await new Promise(r=>window.setTimeout(r,400));}}await Promise.all([refresh(),refreshKafkaEvents(),refreshCatalogs()]);setApiLog(`주문 취소 완료\norderId=${order.orderId}\nKafka eventId=${eventId||'-'}`);}catch(e){setError(toMessage(e));}finally{setBusy(false);}};
  return <div><div className="admin-toolbar"><div><strong>주문 관리</strong><small>Order 취소 + Kafka 보상 이벤트</small></div><div className="admin-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Order ID, User, Product 검색"/></div></div>
    <div className="order-admin-note"><strong>주문 취소는 Kafka 보상 이벤트로 처리합니다.</strong><span>ORDER_CANCELLED → Catalog Consumer → INVENTORY_RESTORED 흐름을 확인할 수 있습니다.</span>{lastEvent&&<Link href="/monitor/kafka">최근 취소 Kafka Flow 보기 →</Link>}</div>
    {error&&<div className="admin-error"><strong>API 오류</strong><pre>{error}</pre></div>}
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ORDER ID</th><th>USER</th><th>PRODUCT</th><th>수량</th><th>결제금액</th><th>주문일시</th><th>관리</th></tr></thead><tbody>{filtered.map(order=><tr key={order.orderId}><td><code className="truncate-code">{order.orderId}</code></td><td><code>{order.userId}</code></td><td>{order.productId}</td><td>{order.qty}</td><td><strong>{money(order.totalPrice??order.unitPrice*order.qty)}</strong></td><td>{dateTime(order.createdAt)}</td><td><div className="row-actions"><button className="danger" disabled={busy} onClick={()=>void cancel(order)}>취소/삭제</button></div></td></tr>)}</tbody></table></div>
  </div>;
}
