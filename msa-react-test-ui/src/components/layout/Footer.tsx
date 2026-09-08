'use client';

import { useMarket } from '@/context/MarketProvider';

export default function Footer() {
  const { health } = useMarket();
  return <footer className="store-footer">
    <div className="page-width footer-inner">
      <div><strong>MSA MARKET</strong><p>Next.js · TypeScript · Gateway · Eureka · Spring Boot · Kafka · MariaDB</p></div>
      <div className="footer-services">{['Gateway', 'User', 'Catalog', 'Order'].map(name => <span key={name}><i className={health[name] && !health[name].startsWith('ERROR') ? 'online' : 'offline'} />{name}</span>)}</div>
    </div>
  </footer>;
}
