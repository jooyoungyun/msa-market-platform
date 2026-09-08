'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, toMessage } from '@/lib/api';
import { useMarket } from '@/context/MarketProvider';
import type { User } from '@/types/api';

export default function AdminUsersPage() {
  const { users, refreshUsers, login, setApiLog } = useMarket();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [edit, setEdit] = useState<User | null>(null);
  useEffect(() => { if (login.userId) void refreshUsers().catch(e => setError(toMessage(e))); }, [login.userId, refreshUsers]);
  const filtered = useMemo(() => users.filter(v => !query.trim() || `${v.userId} ${v.email} ${v.name}`.toLowerCase().includes(query.toLowerCase())), [users, query]);
  const create = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const form=e.currentTarget; const fd=new FormData(form); setBusy(true); try { await api.createUser({email:String(fd.get('email')), name:String(fd.get('name')), pwd:String(fd.get('pwd'))}); await refreshUsers(); form.reset(); setApiLog('관리자 사용자 등록 성공'); } catch(e){setError(toMessage(e));} finally{setBusy(false);} };
  const save = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); if(!edit)return; const fd=new FormData(e.currentTarget); const pwd=String(fd.get('pwd')??'').trim(); setBusy(true); try { await api.updateUser(edit.userId,{email:String(fd.get('email')),name:String(fd.get('name')),...(pwd?{pwd}:{})}); setEdit(null); await refreshUsers(); } catch(e){setError(toMessage(e));} finally{setBusy(false);} };
  const remove = async (user: User) => { if(!window.confirm(`${user.name} 사용자를 삭제할까요?`))return; try{await api.deleteUser(user.userId);await refreshUsers();}catch(e){setError(toMessage(e));} };
  return <div><div className="admin-toolbar"><div><strong>사용자 관리</strong><small>조회 · 등록 · 수정 · 삭제</small></div><div className="admin-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ID, 이름, 이메일 검색"/></div></div>
    {error&&<div className="admin-error"><strong>API 오류</strong><pre>{error}</pre><button onClick={()=>setError('')}>닫기</button></div>}
    <form className="admin-create-row" onSubmit={create}><div><label>이메일</label><input name="email" type="email" placeholder="new@msa.com" required/></div><div><label>이름</label><input name="name" placeholder="사용자 이름" required/></div><div><label>초기 비밀번호</label><input name="pwd" type="password" minLength={8} placeholder="8자 이상" required/></div><button disabled={busy}>+ 사용자 등록</button></form>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>USER ID</th><th>이름</th><th>이메일</th><th>상태</th><th>관리</th></tr></thead><tbody>{filtered.map(user=><tr key={user.userId}><td><code>{user.userId}</code></td><td><strong>{user.name}</strong></td><td>{user.email}</td><td><span className="status-pill active">ACTIVE</span></td><td><div className="row-actions"><button onClick={()=>setEdit(user)}>수정</button><button className="danger" disabled={user.userId===login.userId} onClick={()=>void remove(user)}>삭제</button></div></td></tr>)}</tbody></table></div>
    {edit&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEdit(null);}}><form className="modal admin-edit-modal" onSubmit={save}><button type="button" className="modal-close" onClick={()=>setEdit(null)}>×</button><span className="admin-eyebrow">EDIT USER</span><h2>사용자 수정</h2><label>User ID</label><input value={edit.userId} disabled/><label>이름</label><input name="name" defaultValue={edit.name} required/><label>이메일</label><input name="email" type="email" defaultValue={edit.email} required/><label>비밀번호 변경</label><input name="pwd" type="password" minLength={8} placeholder="변경하지 않으면 비워두세요"/><button className="admin-save" disabled={busy}>변경사항 저장</button></form></div>}
  </div>;
}
