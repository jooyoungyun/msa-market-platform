type Props = {
  health: Record<string, string>;
};

export default function ServiceTrustSection({ health }: Props) {
  return (
    <section className="page-width trust-row">
      <div><span>⇢</span><p><strong>Gateway :8000</strong><small>{serviceStatus(health.Gateway)}</small></p></div>
      <div><span>✓</span><p><strong>회원 / JWT</strong><small>User Service</small></p></div>
      <div><span>◫</span><p><strong>상품 / 재고</strong><small>Catalog Service</small></p></div>
      <div><span>◎</span><p><strong>주문 / 내역</strong><small>Order Service</small></p></div>
      <div><span>⚡</span><p><strong>Kafka 이벤트</strong><small>Async Inventory</small></p></div>
    </section>
  );
}

function serviceStatus(value?: string) {
  return value && !value.startsWith('ERROR') ? 'RUNNING' : 'Single Entry Point';
}
