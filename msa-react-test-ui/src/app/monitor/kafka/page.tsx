'use client';

import KafkaFlow from '@/components/monitor/KafkaFlow';
import { useMarket } from '@/context/MarketProvider';

export default function KafkaMonitorPage() {
  const { kafkaEvents, kafkaAutoRefresh, focusedKafkaEventId, refreshKafkaEvents, clearKafkaEvents, setKafkaAutoRefresh } = useMarket();
  return <div className="monitor-page route-section">
    <section className="page-width monitor-hero"><div><span className="admin-eyebrow">KAFKA LIVE FLOW</span><h1>주문 이벤트 흐름</h1><p>Order Producer → Kafka Broker → Catalog Consumer → MariaDB 재고 반영을 실제 partition/offset과 함께 확인합니다.</p></div></section>
    <KafkaFlow events={kafkaEvents} autoRefresh={kafkaAutoRefresh} focusEventId={focusedKafkaEventId} onToggleAutoRefresh={() => setKafkaAutoRefresh(v => !v)} onRefresh={() => void refreshKafkaEvents()} onClear={() => void clearKafkaEvents()} />
  </div>;
}
