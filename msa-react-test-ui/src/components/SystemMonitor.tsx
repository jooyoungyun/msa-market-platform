import KafkaFlow from './KafkaFlow';
import type { KafkaEventLog } from '../types/api';

type Props = {
  health: Record<string, string>;
  events: KafkaEventLog[];
  autoRefresh: boolean;
  focusEventId: string;
  apiLog: string;
  token: string;
  onRefreshHealth: () => void;
  onRefreshKafka: () => void;
  onClearKafka: () => void;
  onToggleKafka: () => void;
};

export default function SystemMonitor(props: Props) {
  const online = (value?: string) => Boolean(value && !value.startsWith('ERROR'));
  const masked = props.token ? `${props.token.slice(0, 24)}...${props.token.slice(-12)}` : '로그인 후 JWT가 표시됩니다.';
  return <div className="monitor-page">
    <section className="page-width monitor-hero">
      <div><span className="admin-eyebrow">SYSTEM MONITOR</span><h1>MSA 실행 흐름 관찰</h1><p>고객 기능이 아니라 개발·시연을 위한 관찰 화면입니다. 서비스 상태, Gateway/JWT, Kafka 메시지 흐름과 API 결과를 확인합니다.</p></div>
      <button className="admin-refresh" onClick={props.onRefreshHealth}>↻ 서비스 상태 확인</button>
    </section>

    <section className="page-width monitor-service-grid">
      {['Gateway', 'User', 'Catalog', 'Order'].map(name => <article key={name} className="monitor-service-card"><div className={online(props.health[name]) ? 'monitor-dot on' : 'monitor-dot'} /><div><strong>{name} Service</strong><small>{props.health[name] ?? '확인 전'}</small></div><span>{online(props.health[name]) ? 'RUNNING' : 'CHECK'}</span></article>)}
    </section>

    <KafkaFlow events={props.events} autoRefresh={props.autoRefresh} focusEventId={props.focusEventId} onToggleAutoRefresh={props.onToggleKafka} onRefresh={props.onRefreshKafka} onClear={props.onClearKafka} />

    <section className="page-width monitor-debug-grid">
      <article className="monitor-debug-card"><header><div><span>API DEBUG LOG</span><strong>최근 프론트엔드 API 실행 결과</strong></div></header><pre>{props.apiLog}</pre></article>
      <article className="monitor-debug-card"><header><div><span>JWT SESSION</span><strong>Gateway 인증 토큰</strong></div></header><div className="monitor-token"><p>React의 sessionStorage에 저장되고 User API 호출 시 Axios가 Bearer Header로 자동 전송합니다.</p><code>{masked}</code></div></article>
    </section>
  </div>;
}
