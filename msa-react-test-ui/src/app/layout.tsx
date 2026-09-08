import type { Metadata } from 'next';
import './globals.css';
import { MarketProvider } from '@/context/MarketProvider';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'MSA Market | Next.js Microservice Commerce',
  description: 'Spring Cloud Gateway, Eureka, Kafka, MariaDB 기반 MSA 포트폴리오 쇼핑몰',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body><MarketProvider><div className="store-app"><Header /><main className="route-main">{children}</main><Footer /></div></MarketProvider></body></html>;
}
