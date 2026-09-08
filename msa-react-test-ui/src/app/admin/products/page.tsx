'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, toMessage } from '@/lib/api';
import { money, dateTime } from '@/lib/format';
import { useMarket } from '@/context/MarketProvider';
import type { Catalog } from '@/types/api';

export default function AdminProductsPage() {
  const { catalogs, refreshCatalogs, login } = useMarket();
  const [query,setQuery]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [edit,setEdit]=useState<Catalog|null>(null);
  useEffect(()=>{void refreshCatalogs().catch(e=>setError(toMessage(e)));},[refreshCatalogs]);
  const filtered=useMemo(()=>catalogs.filter(v=>!query.trim()||`${v.productId} ${v.productName}`.toLowerCase().includes(query.toLowerCase())),[catalogs,query]);
  const create=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const form=e.currentTarget,fd=new FormData(form);setBusy(true);try{await api.createCatalog({productId:String(fd.get('productId')),productName:String(fd.get('productName')),stock:Number(fd.get('stock')),unitPrice:Number(fd.get('unitPrice'))});await refreshCatalogs();form.reset();}catch(e){setError(toMessage(e));}finally{setBusy(false);}};
  const save=async(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!edit)return;const fd=new FormData(e.currentTarget);setBusy(true);try{await api.updateCatalog(edit.productId,{productName:String(fd.get('productName')),stock:Number(fd.get('stock')),unitPrice:Number(fd.get('unitPrice'))});setEdit(null);await refreshCatalogs();}catch(e){setError(toMessage(e));}finally{setBusy(false);}};
  const remove=async(item:Catalog)=>{if(!window.confirm(`${item.productName} 상품을 삭제할까요?`))return;try{await api.deleteCatalog(item.productId);await refreshCatalogs();}catch(e){setError(toMessage(e));}};
  return <div><div className="admin-toolbar"><div><strong>상품 관리</strong><small>Catalog Service CRUD</small></div><div className="admin-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="상품코드, 상품명 검색"/></div></div>
    {!login.userId&&<div className="admin-warning">등록/수정/삭제는 JWT 인증이 필요합니다.</div>}{error&&<div className="admin-error"><strong>API 오류</strong><pre>{error}</pre><button onClick={()=>setError('')}>닫기</button></div>}
    <form className="admin-create-row catalog-row" onSubmit={create}><div><label>상품코드</label><input name="productId" placeholder="CATALOG-004" required/></div><div><label>상품명</label><input name="productName" placeholder="상품명" required/></div><div><label>재고</label><input name="stock" type="number" min="0" defaultValue="100" required/></div><div><label>단가</label><input name="unitPrice" type="number" min="0" defaultValue="1000" required/></div><button disabled={busy}>+ 상품 등록</button></form>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>상품코드</th><th>상품명</th><th>재고</th><th>단가</th><th>등록일</th><th>관리</th></tr></thead><tbody>{filtered.map(item=><tr key={item.productId}><td><code>{item.productId}</code></td><td><strong>{item.productName}</strong></td><td><span className={item.stock<=20?'stock-admin low':'stock-admin'}>{item.stock}</span></td><td>{money(item.unitPrice)}</td><td>{dateTime(item.createdAt)}</td><td><div className="row-actions"><button onClick={()=>setEdit(item)}>수정</button><button className="danger" onClick={()=>void remove(item)}>삭제</button></div></td></tr>)}</tbody></table></div>
    {edit&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEdit(null);}}><form className="modal admin-edit-modal" onSubmit={save}><button type="button" className="modal-close" onClick={()=>setEdit(null)}>×</button><span className="admin-eyebrow">EDIT PRODUCT</span><h2>상품 수정</h2><label>상품코드</label><input value={edit.productId} disabled/><label>상품명</label><input name="productName" defaultValue={edit.productName} required/><label>재고</label><input name="stock" type="number" min="0" defaultValue={edit.stock} required/><label>단가</label><input name="unitPrice" type="number" min="0" defaultValue={edit.unitPrice} required/><button className="admin-save" disabled={busy}>변경사항 저장</button></form></div>}
  </div>;
}
