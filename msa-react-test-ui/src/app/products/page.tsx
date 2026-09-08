'use client';

import { useMemo, useState } from 'react';
import ProductGrid from '@/components/product/ProductGrid';
import { useMarket } from '@/context/MarketProvider';

type Filter = 'all' | 'available' | 'low';

export default function ProductsPage() {
  const { catalogs, refreshCatalogs, busy, toast } = useMarket();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalogs.filter(item => {
      if (term && !`${item.productId} ${item.productName}`.toLowerCase().includes(term)) return false;
      if (filter === 'available') return item.stock > 0;
      if (filter === 'low') return item.stock > 0 && item.stock <= 20;
      return true;
    });
  }, [catalogs, search, filter]);

  return <section className="page-width product-section route-section">
    {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    <div className="section-heading"><div><span className="section-kicker">PRODUCTS</span><h1>상품 카탈로그</h1><p>상품 조회와 장바구니 기능을 Product 컴포넌트로 분리했습니다.</p></div><button className="refresh-button" onClick={() => void refreshCatalogs()} disabled={busy}>↻ 상품 새로고침</button></div>
    <div className="route-search-box"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="상품명 또는 상품코드 검색" /></div>
    <div className="filter-row"><button className={filter === 'all' ? 'filter active' : 'filter'} onClick={() => setFilter('all')}>전체 <b>{catalogs.length}</b></button><button className={filter === 'available' ? 'filter active' : 'filter'} onClick={() => setFilter('available')}>구매 가능</button><button className={filter === 'low' ? 'filter active' : 'filter'} onClick={() => setFilter('low')}>재고 임박</button></div>
    <ProductGrid products={filtered} />
  </section>;
}
