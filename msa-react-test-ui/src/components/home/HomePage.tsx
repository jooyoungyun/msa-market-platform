'use client';

import HeroSection from './HeroSection';
import ServiceTrustSection from './ServiceTrustSection';
import FeaturedProductsSection from './FeaturedProductsSection';
import FeatureNavigationSection from './FeatureNavigationSection';
import { useMarket } from '@/context/MarketProvider';

export default function HomePage() {
  const { catalogs, health, toast } = useMarket();

  return (
    <>
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      <HeroSection />
      <ServiceTrustSection health={health} />
      <FeaturedProductsSection products={catalogs.slice(0, 4)} />
      <FeatureNavigationSection />
    </>
  );
}
