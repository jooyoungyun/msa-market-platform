import Link from 'next/link';

const FEATURES = [
  {
    href: '/admin',
    label: 'ADMIN',
    title: '서비스 데이터 관리',
    description: '사용자 · 상품 · 주문을 독립 Route에서 관리합니다.',
  },
  {
    href: '/monitor/kafka',
    label: 'KAFKA',
    title: '메시지 흐름 시각화',
    description: 'Producer → Broker → Consumer → 재고 반영을 추적합니다.',
  },
  {
    href: '/monitor',
    label: 'OBSERVE',
    title: 'System Monitor',
    description: 'Gateway/JWT/API 상태를 한 화면에서 확인합니다.',
  },
] as const;

export default function FeatureNavigationSection() {
  return (
    <section className="page-width next-feature-grid">
      {FEATURES.map(feature => (
        <Link key={feature.href} href={feature.href}>
          <span>{feature.label}</span>
          <strong>{feature.title}</strong>
          <p>{feature.description}</p>
        </Link>
      ))}
    </section>
  );
}
