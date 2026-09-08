'use client';

import ProductCard from './ProductCard';
import type { Catalog } from '@/types/api';

export default function ProductGrid({ products }: { products: Catalog[] }) {
  if (!products.length) return <div className="empty-state"><span>⌕</span><strong>조건에 맞는 상품이 없습니다.</strong><small>검색어나 필터를 변경해보세요.</small></div>;
  return <div className="product-grid">{products.map((product, index) => <ProductCard key={product.productId} product={product} index={index} />)}</div>;
}
