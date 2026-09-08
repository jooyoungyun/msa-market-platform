import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="hero-banner">
      <div className="page-width hero-content">
        <div className="hero-copy">
          <span className="hero-kicker">NEXT.JS + SPRING CLOUD MSA</span>
          <h1>
            주문부터 재고까지,<br />
            <em>마이크로서비스로 연결</em>
          </h1>
          <p>Next.js App Router · Spring Cloud Gateway · Eureka · Kafka · MariaDB 기반 쇼핑몰 포트폴리오입니다.</p>
          <div className="hero-cta">
            <Link href="/products" className="primary-cta">상품 둘러보기</Link>
            <Link href="/monitor/kafka" className="secondary-cta">Kafka Flow 보기</Link>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="service-node node-center"><strong>GATEWAY</strong><small>:8000</small></div>
          <div className="service-node node-user"><strong>USER</strong><small>Service</small></div>
          <div className="service-node node-catalog"><strong>CATALOG</strong><small>Service</small></div>
          <div className="service-node node-order"><strong>ORDER</strong><small>Service</small></div>
          <div className="service-node node-kafka"><strong>KAFKA</strong><small>Event Bus</small></div>
          <div className="service-node node-db"><strong>DB</strong><small>MariaDB</small></div>
        </div>
      </div>
    </section>
  );
}
