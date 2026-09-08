import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, toMessage } from '../lib/api';
import type { AdminOrder, Catalog, User } from '../types/api';

type Tab = 'users' | 'catalogs' | 'orders';
type EditTarget = { type: 'user'; value: User } | { type: 'catalog'; value: Catalog } | null;

type Props = {
  loggedInUserId: string;
  onDataChanged?: () => void;
  onLog?: (text: string) => void;
  onKafkaEvent?: (eventId: string) => void;
};

const number = new Intl.NumberFormat('ko-KR');
const money = (value?: number) => `${number.format(value ?? 0)}원`;
const date = (value?: string) => value ? new Date(value).toLocaleString('ko-KR') : '-';

export default function AdminConsole({ loggedInUserId, onDataChanged, onLog, onKafkaEvent }: Props) {
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editTarget, setEditTarget] = useState<EditTarget>(null);

  const refresh = async () => {
    setBusy(true);
    setError('');
    try {
      const [u, c, o] = await Promise.all([api.users(), api.catalogs(), api.allOrders()]);
      setUsers(u);
      setCatalogs(c);
      setOrders(o);
      onLog?.(`관리자 데이터 조회 성공\nusers=${u.length}, catalogs=${c.length}, orders=${o.length}`);
    } catch (e) {
      const message = toMessage(e);
      setError(message);
      onLog?.(`관리자 데이터 조회 실패\n${message}`);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const filteredUsers = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return users;
    return users.filter(v => `${v.userId} ${v.email} ${v.name}`.toLowerCase().includes(q));
  }, [users, query]);

  const filteredCatalogs = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return catalogs;
    return catalogs.filter(v => `${v.productId} ${v.productName}`.toLowerCase().includes(q));
  }, [catalogs, query]);

  const filteredOrders = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter(v => `${v.orderId} ${v.userId} ${v.productId}`.toLowerCase().includes(q));
  }, [orders, query]);

  const submitUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    try {
      await api.createUser({ email: String(fd.get('email')), name: String(fd.get('name')), pwd: String(fd.get('pwd')) });
      form.reset();
      await refresh();
      onDataChanged?.();
    } catch (e) { setError(toMessage(e)); } finally { setBusy(false); }
  };

  const submitCatalog = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    try {
      await api.createCatalog({
        productId: String(fd.get('productId')),
        productName: String(fd.get('productName')),
        stock: Number(fd.get('stock')),
        unitPrice: Number(fd.get('unitPrice')),
      });
      form.reset();
      await refresh();
      onDataChanged?.();
    } catch (e) { setError(toMessage(e)); } finally { setBusy(false); }
  };

  const deleteUser = async (user: User) => {
    if (!window.confirm(`${user.name} (${user.userId}) 사용자를 삭제할까요?\nOrder Service의 기존 주문 이력은 유지됩니다.`)) return;
    try {
      await api.deleteUser(user.userId);
      await refresh();
      onDataChanged?.();
    } catch (e) { setError(toMessage(e)); }
  };

  const deleteCatalog = async (item: Catalog) => {
    if (!window.confirm(`${item.productName} (${item.productId}) 상품을 삭제할까요?\n기존 주문 이력은 유지됩니다.`)) return;
    try {
      await api.deleteCatalog(item.productId);
      await refresh();
      onDataChanged?.();
    } catch (e) { setError(toMessage(e)); }
  };

  const deleteOrder = async (order: AdminOrder) => {
    if (!window.confirm(`${order.orderId} 주문을 취소/삭제할까요?\nKafka ORDER_CANCELLED 이벤트를 발행하고 상품 재고 ${order.qty}개를 복원합니다.`)) return;
    setBusy(true);
    setError('');
    try {
      const eventId = await api.deleteOrder(order.orderId);
      if (eventId) {
        onKafkaEvent?.(eventId);
        for (let i = 0; i < 12; i += 1) {
          const events = await api.kafkaEvents(150);
          const completed = events.some(v => v.eventId === eventId && (v.stage === 'INVENTORY_RESTORED' || v.status === 'ERROR'));
          if (completed) break;
          await new Promise(resolve => window.setTimeout(resolve, 400));
        }
      }
      await refresh();
      onDataChanged?.();
      onLog?.(`주문 취소/삭제 완료\norderId=${order.orderId}\nKafka eventId=${eventId || '-'}`);
    } catch (e) {
      const message = toMessage(e);
      setError(message);
      onLog?.(`주문 취소 실패\n${message}`);
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editTarget) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      if (editTarget.type === 'user') {
        const pwd = String(fd.get('pwd') ?? '').trim();
        await api.updateUser(editTarget.value.userId, {
          email: String(fd.get('email')),
          name: String(fd.get('name')),
          ...(pwd ? { pwd } : {}),
        });
      } else {
        await api.updateCatalog(editTarget.value.productId, {
          productName: String(fd.get('productName')),
          stock: Number(fd.get('stock')),
          unitPrice: Number(fd.get('unitPrice')),
        });
      }
      setEditTarget(null);
      await refresh();
      onDataChanged?.();
    } catch (e) { setError(toMessage(e)); } finally { setBusy(false); }
  };

  const sales = orders.reduce((sum, v) => sum + (v.totalPrice ?? v.unitPrice * v.qty), 0);
  const lowStock = catalogs.filter(v => v.stock <= 20).length;

  return (
    <section className="admin-page page-width">
      <div className="admin-page-head">
        <div>
          <span className="admin-eyebrow">ADMIN CONSOLE</span>
          <h1>서비스 데이터 관리</h1>
          <p>User · Catalog · Order 마이크로서비스의 데이터를 Gateway를 통해 관리합니다.</p>
        </div>
        <div className="admin-head-actions">
          <span className={loggedInUserId ? 'admin-session online' : 'admin-session'}>● {loggedInUserId || '로그인 필요'}</span>
          <button className="admin-refresh" onClick={() => void refresh()} disabled={busy}>↻ 전체 새로고침</button>
        </div>
      </div>

      {!loggedInUserId && <div className="admin-warning">User 관리 PUT/DELETE는 JWT가 필요합니다. 먼저 쇼핑몰 화면에서 로그인하세요.</div>}
      {error && <div className="admin-error"><strong>API 오류</strong><pre>{error}</pre><button onClick={() => setError('')}>닫기</button></div>}

      <div className="admin-stat-grid">
        <div><span>USERS</span><strong>{users.length}</strong><small>User Service</small></div>
        <div><span>PRODUCTS</span><strong>{catalogs.length}</strong><small>Catalog Service</small></div>
        <div><span>ORDERS</span><strong>{orders.length}</strong><small>Order Service</small></div>
        <div><span>SALES</span><strong>{money(sales)}</strong><small>누적 주문금액</small></div>
        <div><span>LOW STOCK</span><strong>{lowStock}</strong><small>재고 20 이하</small></div>
      </div>

      <div className="admin-workspace">
        <aside className="admin-sidebar">
          <button className={tab === 'users' ? 'active' : ''} onClick={() => { setTab('users'); setQuery(''); }}><span>♙</span><div><strong>사용자 관리</strong><small>{users.length} users</small></div></button>
          <button className={tab === 'catalogs' ? 'active' : ''} onClick={() => { setTab('catalogs'); setQuery(''); }}><span>◫</span><div><strong>상품 관리</strong><small>{catalogs.length} products</small></div></button>
          <button className={tab === 'orders' ? 'active' : ''} onClick={() => { setTab('orders'); setQuery(''); }}><span>◎</span><div><strong>주문 관리</strong><small>{orders.length} orders</small></div></button>
          <div className="admin-side-note"><strong>MSA 데이터 분리</strong><p>사용자 삭제 시 Order 데이터는 자동 삭제하지 않습니다. 서비스별 데이터 소유권을 유지합니다.</p></div>
        </aside>

        <div className="admin-content">
          <div className="admin-toolbar">
            <div><strong>{tab === 'users' ? '사용자 관리' : tab === 'catalogs' ? '상품 관리' : '주문 관리'}</strong><small>조회 · 등록 · 수정 · 삭제</small></div>
            <div className="admin-search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ID, 이름, 이메일 검색" /></div>
          </div>

          {tab === 'users' && <>
            <form className="admin-create-row" onSubmit={submitUser}>
              <div><label>이메일</label><input name="email" type="email" placeholder="new@msa.com" required /></div>
              <div><label>이름</label><input name="name" placeholder="사용자 이름" required /></div>
              <div><label>초기 비밀번호</label><input name="pwd" type="password" minLength={8} placeholder="8자 이상" required /></div>
              <button disabled={busy}>+ 사용자 등록</button>
            </form>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>USER ID</th><th>이름</th><th>이메일</th><th>상태</th><th>관리</th></tr></thead><tbody>
              {filteredUsers.map(user => <tr key={user.userId}><td><code>{user.userId}</code></td><td><strong>{user.name}</strong></td><td>{user.email}</td><td><span className="status-pill active">ACTIVE</span></td><td><div className="row-actions"><button onClick={() => setEditTarget({ type: 'user', value: user })}>수정</button><button className="danger" disabled={user.userId === loggedInUserId} onClick={() => void deleteUser(user)}>삭제</button></div></td></tr>)}
            </tbody></table></div>
          </>}

          {tab === 'catalogs' && <>
            <form className="admin-create-row catalog-row" onSubmit={submitCatalog}>
              <div><label>상품코드</label><input name="productId" placeholder="CATALOG-004" required /></div>
              <div><label>상품명</label><input name="productName" placeholder="상품명" required /></div>
              <div><label>재고</label><input name="stock" type="number" min="0" defaultValue="100" required /></div>
              <div><label>단가</label><input name="unitPrice" type="number" min="0" defaultValue="1000" required /></div>
              <button disabled={busy}>+ 상품 등록</button>
            </form>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>상품코드</th><th>상품명</th><th>재고</th><th>단가</th><th>등록일</th><th>관리</th></tr></thead><tbody>
              {filteredCatalogs.map(item => <tr key={item.productId}><td><code>{item.productId}</code></td><td><strong>{item.productName}</strong></td><td><span className={item.stock <= 20 ? 'stock-admin low' : 'stock-admin'}>{item.stock}</span></td><td>{money(item.unitPrice)}</td><td>{date(item.createdAt)}</td><td><div className="row-actions"><button onClick={() => setEditTarget({ type: 'catalog', value: item })}>수정</button><button className="danger" onClick={() => void deleteCatalog(item)}>삭제</button></div></td></tr>)}
            </tbody></table></div>
          </>}

          {tab === 'orders' && <>
            <div className="order-admin-note"><strong>주문 취소는 Kafka 보상 이벤트로 처리합니다.</strong><span>삭제 시 ORDER_CANCELLED 이벤트가 발행되고 Catalog Consumer가 주문 수량만큼 재고를 복원합니다. Flow는 System Monitor에서 확인할 수 있습니다.</span></div>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ORDER ID</th><th>USER</th><th>PRODUCT</th><th>수량</th><th>결제금액</th><th>주문일시</th><th>관리</th></tr></thead><tbody>
              {filteredOrders.map(order => <tr key={order.orderId}><td><code className="truncate-code">{order.orderId}</code></td><td><code>{order.userId}</code></td><td>{order.productId}</td><td>{order.qty}</td><td><strong>{money(order.totalPrice ?? order.unitPrice * order.qty)}</strong></td><td>{date(order.createdAt)}</td><td><div className="row-actions"><button className="danger" onClick={() => void deleteOrder(order)}>취소/삭제</button></div></td></tr>)}
            </tbody></table></div>
          </>}
        </div>
      </div>

      {editTarget && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setEditTarget(null); }}>
        <form className="modal admin-edit-modal" onSubmit={submitEdit}>
          <button type="button" className="modal-close" onClick={() => setEditTarget(null)}>×</button>
          <span className="admin-eyebrow">EDIT</span>
          <h2>{editTarget.type === 'user' ? '사용자 수정' : '상품 수정'}</h2>
          {editTarget.type === 'user' ? <>
            <label>User ID</label><input value={editTarget.value.userId} disabled />
            <label>이름</label><input name="name" defaultValue={editTarget.value.name} required />
            <label>이메일</label><input name="email" type="email" defaultValue={editTarget.value.email} required />
            <label>비밀번호 변경</label><input name="pwd" type="password" minLength={8} placeholder="변경하지 않으면 비워두세요" />
          </> : <>
            <label>상품코드</label><input value={editTarget.value.productId} disabled />
            <label>상품명</label><input name="productName" defaultValue={editTarget.value.productName} required />
            <label>재고</label><input name="stock" type="number" min="0" defaultValue={editTarget.value.stock} required />
            <label>단가</label><input name="unitPrice" type="number" min="0" defaultValue={editTarget.value.unitPrice} required />
          </>}
          <button className="admin-save" disabled={busy}>변경사항 저장</button>
        </form>
      </div>}
    </section>
  );
}
