import Link from 'next/link';
import ProductGrid from '@/components/product/ProductGrid';
import type { Catalog } from '@/types/api';

type Props = {
  products: Catalog[];
};

export default function FeaturedProductsSection({ products }: Props) {
  return (
    <section className="page-width product-section">
      <div className="section-heading">
        <div>
          <span className="section-kicker">FEATURED</span>
          <h2>추천 상품</h2>
          <p>Catalog Service에서 조회한 상품을 컴포넌트로 렌더링합니다.</p>
        </div>
        <Link className="refresh-button" href="/products">전체 상품 →</Link>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
