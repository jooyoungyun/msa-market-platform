'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KafkaEventLog } from '@/types/api';

type Props = {
  events: KafkaEventLog[];
  autoRefresh: boolean;
  focusEventId?: string;
  onToggleAutoRefresh: () => void;
  onRefresh: () => void;
  onClear: () => void;
};

const stageLabel: Record<string, string> = {
  ORDER_STORED: '주문 DB 저장',
  ORDER_DELETED: '주문 DB 삭제',
  PRODUCER_SEND: 'Producer 전송 요청',
  BROKER_ACK: 'Kafka Broker ACK',
  CONSUMED: 'Catalog Consumer 수신',
  INVENTORY_UPDATED: '재고 DB 반영',
  INVENTORY_RESTORED: '재고 DB 복원',
  PRODUCER_ERROR: 'Producer 오류',
  CONSUMER_ERROR: 'Consumer 오류',
};


const fmtTime = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleTimeString('ko-KR', { hour12: false });
};

export default function KafkaFlow({ events, autoRefresh, focusEventId, onToggleAutoRefresh, onRefresh, onClear }: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, KafkaEventLog[]>();
    for (const event of events) {
      if (!map.has(event.eventId)) map.set(event.eventId, []);
      map.get(event.eventId)!.push(event);
    }
    return Array.from(map.entries()).map(([eventId, items]) => ({
      eventId,
      items: items.sort((a, b) => a.id - b.id),
      latestId: Math.max(...items.map(v => v.id)),
    })).sort((a, b) => b.latestId - a.latestId);
  }, [events]);

  const [selectedId, setSelectedId] = useState('');
  const appliedFocusEventIdRef = useRef('');

  useEffect(() => {
    if (!groups.length) {
      setSelectedId('');
      return;
    }

    // 주문 직후 전달된 focusEventId는 '새 값이 들어왔을 때 한 번만' 자동 선택한다.
    // 기존 구현은 selectedId가 바뀔 때마다 focusEventId를 다시 선택해서
    // 사용자가 최근 Kafka Events를 클릭해도 즉시 원래 이벤트로 되돌아가는 문제가 있었다.
    if (
      focusEventId &&
      focusEventId !== appliedFocusEventIdRef.current &&
      groups.some(group => group.eventId === focusEventId)
    ) {
      appliedFocusEventIdRef.current = focusEventId;
      setSelectedId(focusEventId);
      return;
    }

    // 자동 새로고침으로 events/groups가 갱신되어도 사용자가 선택한 이벤트는 유지한다.
    setSelectedId(current =>
      current && groups.some(group => group.eventId === current)
        ? current
        : groups[0].eventId
    );
  }, [focusEventId, groups]);

  const selected = groups.find(g => g.eventId === selectedId) ?? groups[0];
  const selectedEvents = selected?.items ?? [];
  const last = selectedEvents[selectedEvents.length - 1];
  const failed = selectedEvents.some(v => v.status === 'ERROR' || v.stage.includes('ERROR'));
  const isCancel = last?.eventType === 'ORDER_CANCELLED';
  const complete = selectedEvents.some(v => v.stage === 'INVENTORY_UPDATED' || v.stage === 'INVENTORY_RESTORED');
  const flowStages = isCancel
    ? [
        { key: 'ORDER_DELETED', title: 'Order Service', sub: '주문 취소/삭제', icon: '①' },
        { key: 'PRODUCER_SEND', title: 'Kafka Producer', sub: '보상 이벤트 발행', icon: '②' },
        { key: 'BROKER_ACK', title: 'Kafka Broker', sub: 'Topic 저장', icon: '③' },
        { key: 'CONSUMED', title: 'Catalog Consumer', sub: '취소 메시지 수신', icon: '④' },
        { key: 'INVENTORY_RESTORED', title: 'MariaDB', sub: '재고 복원', icon: '⑤' },
      ]
    : [
        { key: 'ORDER_STORED', title: 'Order Service', sub: '주문 저장', icon: '①' },
        { key: 'PRODUCER_SEND', title: 'Kafka Producer', sub: '이벤트 발행', icon: '②' },
        { key: 'BROKER_ACK', title: 'Kafka Broker', sub: 'Topic 저장', icon: '③' },
        { key: 'CONSUMED', title: 'Catalog Consumer', sub: '메시지 수신', icon: '④' },
        { key: 'INVENTORY_UPDATED', title: 'MariaDB', sub: '재고 차감', icon: '⑤' },
      ];

  const hasStage = (stage: string) => selectedEvents.some(v => v.stage === stage);
  const hasErrorAt = (stage: string) => {
    if (stage === 'PRODUCER_SEND') return selectedEvents.some(v => v.stage === 'PRODUCER_ERROR');
    if (stage === 'CONSUMED' || stage === 'INVENTORY_UPDATED' || stage === 'INVENTORY_RESTORED') return selectedEvents.some(v => v.stage === 'CONSUMER_ERROR');
    return false;
  };

  return (
    <section className="kafka-section" id="kafka-flow">
      <div className="page-width">
        <div className="kafka-heading">
          <div>
            <span className="section-kicker kafka-kicker">KAFKA LIVE FLOW</span>
            <h2>주문 생성·취소 이벤트가 이동하는 과정</h2>
            <p>주문 시 재고 차감, 관리자 취소 시 재고 복원을 실제 Topic · Partition · Offset과 함께 표시합니다.</p>
          </div>
          <div className="kafka-actions">
            <button className={autoRefresh ? 'live-toggle on' : 'live-toggle'} onClick={onToggleAutoRefresh}>
              <i /> {autoRefresh ? 'LIVE 1.5s' : 'AUTO OFF'}
            </button>
            <button className="kafka-button" onClick={onRefresh}>↻ 새로고침</button>
            <button className="kafka-button danger" onClick={onClear}>로그 초기화</button>
          </div>
        </div>

        {!selected ? (
          <div className="kafka-empty">
            <div className="kafka-empty-icon">⚡</div>
            <strong>아직 Kafka 이벤트가 없습니다.</strong>
            <p>상품 주문 또는 관리자 주문 취소 시 Order Service → Kafka → Catalog Service 흐름이 이곳에 나타납니다.</p>
          </div>
        ) : (
          <>
            <div className="kafka-overview">
              <div className="kafka-event-info">
                <div className="event-status-row">
                  <span className={failed ? 'event-state error' : complete ? 'event-state complete' : 'event-state pending'}>
                    {failed ? 'ERROR' : complete ? 'COMPLETED' : 'PROCESSING'}
                  </span>
                  <span>{last?.eventType ?? 'ORDER_CREATED'}</span>
                </div>
                <strong>{last?.productId ?? '-'}</strong>
                <code>{selected.eventId}</code>
              </div>
              <div className="kafka-meta-box"><small>TOPIC</small><strong>{last?.topic ?? 'example-catalog-topic'}</strong></div>
              <div className="kafka-meta-box"><small>PARTITION</small><strong>{last?.partitionNo ?? '-'}</strong></div>
              <div className="kafka-meta-box"><small>OFFSET</small><strong>{last?.offsetNo ?? '-'}</strong></div>
              <div className="kafka-meta-box"><small>ORDER ID</small><strong className="meta-order">{last?.orderId ?? '-'}</strong></div>
            </div>

            <div className="kafka-flow-track">
              {flowStages.map((stage, index) => {
                const done = hasStage(stage.key);
                const error = hasErrorAt(stage.key);
                return (
                  <div className="flow-stage-wrap" key={stage.key}>
                    <div className={`flow-stage ${error ? 'error' : done ? 'done' : 'waiting'}`}>
                      <span className="flow-stage-icon">{error ? '!' : stage.icon}</span>
                      <div><strong>{stage.title}</strong><small>{error ? '처리 오류' : stage.sub}</small></div>
                    </div>
                    {index < flowStages.length - 1 && <div className={done ? 'flow-connector active' : 'flow-connector'}><span>→</span></div>}
                  </div>
                );
              })}
            </div>

            <div className="kafka-body-grid">
              <div className="kafka-timeline-card">
                <div className="kafka-card-head"><strong>Event Timeline</strong><span>{selectedEvents.length} stages</span></div>
                <div className="kafka-timeline">
                  {selectedEvents.map(event => (
                    <div className={`timeline-row ${event.status === 'ERROR' ? 'error' : ''}`} key={event.id}>
                      <div className="timeline-dot" />
                      <div className="timeline-main">
                        <div><strong>{stageLabel[event.stage] ?? event.stage}</strong><span>{fmtTime(event.createdAt)}</span></div>
                        <p>{(event.stage === 'INVENTORY_UPDATED' || event.stage === 'INVENTORY_RESTORED')
                          ? `재고 ${event.beforeStock ?? '-'} → ${event.afterStock ?? '-'}`
                          : event.errorMessage || `${event.producer ?? ''}${event.consumer ? ` → ${event.consumer}` : ''}`}</p>
                      </div>
                      <div className="timeline-offset">
                        {event.partitionNo != null && <span>P {event.partitionNo}</span>}
                        {event.offsetNo != null && <span>O {event.offsetNo}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="kafka-payload-card">
                <div className="kafka-card-head"><strong>Kafka Message</strong><span>JSON Payload</span></div>
                <div className="payload-meta">
                  <p><span>Message Key</span><code>{last?.messageKey ?? '-'}</code></p>
                  <p><span>Consumer Group</span><code>catalog-service-group</code></p>
                </div>
                <pre>{last?.payload ? prettyJson(last.payload) : 'Payload가 없습니다.'}</pre>
              </div>
            </div>

            <div className="event-selector">
              <div><strong>최근 Kafka Events</strong><small>eventId를 선택하면 전체 처리 단계를 다시 볼 수 있습니다.</small></div>
              <div className="event-chips">
                {groups.slice(0, 8).map(group => {
                  const item = group.items[group.items.length - 1];
                  const ok = group.items.some(v => v.stage === 'INVENTORY_UPDATED' || v.stage === 'INVENTORY_RESTORED');
                  const err = group.items.some(v => v.status === 'ERROR');
                  return (
                    <button
                      type="button"
                      className={group.eventId === selected?.eventId ? 'event-chip active' : 'event-chip'}
                      key={group.eventId}
                      aria-pressed={group.eventId === selected?.eventId}
                      title={`Kafka Event ${group.eventId}`}
                      onClick={() => setSelectedId(group.eventId)}
                    >
                      <i className={err ? 'err' : ok ? 'ok' : 'pending'} />
                      <span><strong>{item.productId}</strong><small>{fmtTime(item.createdAt)}</small></span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function prettyJson(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}
