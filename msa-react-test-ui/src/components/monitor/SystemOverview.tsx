'use client';

import Link from 'next/link';
import { useMarket } from '@/context/MarketProvider';

export default function SystemOverview() {
  const { health, loadHealth, apiLog, login } = useMarket();
  const online = (value?: string) => Boolean(value && !value.startsWith('ERROR'));
  const masked = login.token ? `${login.token.slice(0, 24)}...${login.token.slice(-12)}` : '로그인 후 JWT가 표시됩니다.';
  return <div className="monitor-page">
    <section className="page-width monitor-hero"><div><span className="admin-eyebrow">SYSTEM MONITOR</span><h1>MSA 실행 상태 관찰</h1><p>서비스 상태, Gateway/JWT, Kafka 이벤트와 API 실행 결과를 페이지별로 확인합니다.</p></div><button className="admin-refresh" onClick={() => void loadHealth()}>↻ 서비스 상태 확인</button></section>
    <section className="page-width monitor-service-grid">{['Gateway', 'User', 'Catalog', 'Order'].map(name => <article key={name} className="monitor-service-card"><div className={online(health[name]) ? 'monitor-dot on' : 'monitor-dot'} /><div><strong>{name} Service</strong><small>{health[name] ?? '확인 전'}</small></div><span>{online(health[name]) ? 'RUNNING' : 'CHECK'}</span></article>)}</section>
    <section className="page-width monitor-link-grid"><Link href="/monitor/kafka"><strong>Kafka Live Flow</strong><span>Topic · Partition · Offset · Consumer · 재고 변화 확인 →</span></Link></section>
    <section className="page-width monitor-debug-grid">
      <article className="monitor-debug-card"><header><div><span>API DEBUG LOG</span><strong>최근 API 실행 결과</strong></div></header><pre>{apiLog}</pre></article>
      <article className="monitor-debug-card"><header><div><span>JWT SESSION</span><strong>Gateway 인증 토큰</strong></div></header><div className="monitor-token"><p>sessionStorage에 저장된 JWT가 Axios Interceptor를 통해 Bearer Header로 전달됩니다.</p><code>{masked}</code></div></article>
    </section>
  </div>;
}
