import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, toMessage } from './lib/api';
import KafkaFlow from './components/KafkaFlow';
import AdminConsole from './components/AdminConsole';
import SystemMonitor from './components/SystemMonitor';
import type { Catalog, KafkaEventLog, LoginResult, Order, User } from './types/api';
import './styles.css';

type CartItem = Catalog & { qty: number };
type Toast = { type: 'success' | 'error'; message: string } | null;
type Page = 'shop' | 'admin' | 'monitor';

const currency = new Intl.NumberFormat('ko-KR');
const fmt = (value?: string) => value ? new Date(value).toLocaleString('ko-KR') : '-';
const money = (value?: number) => `${currency.format(value ?? 0)}원`;

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(sessionStorage.getItem('msa_userId') || 'USER-001');
  const [currentUserName, setCurrentUserName] = useState(sessionStorage.getItem('msa_userName') || '');
  const [health, setHealth] = useState<Record<string, string>>({});
  const [login, setLogin] = useState<LoginResult>(() => ({
    token: sessionStorage.getItem('msa_token') ?? '',
    userId: sessionStorage.getItem('msa_userId') ?? '',
  }));
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'low'>('all');
  const [page, setPage] = useState<Page>('shop');
  const [showLogin, setShowLogin] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [log, setLog] = useState('아직 실행된 API가 없습니다.');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [kafkaEvents, setKafkaEvents] = useState<KafkaEventLog[]>([]);
  const [kafkaAutoRefresh, setKafkaAutoRefresh] = useState(true);
  const [focusedKafkaEventId, setFocusedKafkaEventId] = useState('');

  const notify = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 2600);
  };

  const syncCurrentUserName = (items: User[], userId = selectedUserId) => {
    if (!userId) {
      setCurrentUserName('');
      sessionStorage.removeItem('msa_userName');
      return '';
    }
    const name = items.find(user => user.userId === userId)?.name ?? '';
    setCurrentUserName(name);
    if (name) sessionStorage.setItem('msa_userName', name);
    else sessionStorage.removeItem('msa_userName');
    return name;
  };

  const run = async <T,>(label: string, fn: () => Promise<T>, after?: (data: T) => void) => {
    setBusy(true);
    try {
      const data = await fn();
      after?.(data);
      setLog(`${label} 성공\n\n${JSON.stringify(data, null, 2)}`);
      return data;
    } catch (e) {
      const message = toMessage(e);
      setLog(`${label} 실패\n\n${message}`);
      notify('error', `${label}에 실패했습니다.`);
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const loadHealth = async () => {
    const entries = await Promise.all([
      api.healthGateway().then(v => ['Gateway', v] as const).catch(e => ['Gateway', `ERROR: ${toMessage(e)}`] as const),
      api.healthUser().then(v => ['User', v] as const).catch(e => ['User', `ERROR: ${toMessage(e)}`] as const),
      api.healthCatalog().then(v => ['Catalog', v] as const).catch(e => ['Catalog', `ERROR: ${toMessage(e)}`] as const),
      api.healthOrder().then(v => ['Order', v] as const).catch(e => ['Order', `ERROR: ${toMessage(e)}`] as const),
    ]);
    setHealth(Object.fromEntries(entries));
  };

  const refreshCatalogs = async () => {
    const data = await api.catalogs();
    setCatalogs(data);
    return data;
  };

  const refreshOrders = async (userId = selectedUserId) => {
    if (!userId) return [];
    const data = await api.orders(userId);
    setOrders(data);
    return data;
  };

  const refreshKafkaEvents = async () => {
    const data = await api.kafkaEvents(120);
    setKafkaEvents(data);
    return data;
  };

  const waitForKafka = async (eventIds: string[]) => {
    const targets = eventIds.filter(Boolean);
    if (!targets.length) return;
    for (let i = 0; i < 10; i += 1) {
      try {
        const data = await refreshKafkaEvents();
        const finished = targets.every(eventId => data.some(event =>
          event.eventId === eventId && (event.stage === 'INVENTORY_UPDATED' || event.status === 'ERROR')));
        if (finished) return;
      } catch {
        return;
      }
      await new Promise(resolve => window.setTimeout(resolve, 450));
    }
  };

  useEffect(() => {
    void loadHealth();
    void api.users().then(data => { setUsers(data); syncCurrentUserName(data, selectedUserId); }).catch(() => undefined);
    void refreshCatalogs().catch(() => undefined);
    if (selectedUserId) void refreshOrders(selectedUserId).catch(() => undefined);
  }, []);

  useEffect(() => {
    void refreshKafkaEvents().catch(() => undefined);
    if (!kafkaAutoRefresh) return;
    const timer = window.setInterval(() => {
      void refreshKafkaEvents().catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [kafkaAutoRefresh]);

  const filteredCatalogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalogs.filter(item => {
      const matched = !term || item.productName.toLowerCase().includes(term) || item.productId.toLowerCase().includes(term);
      if (!matched) return false;
      if (filter === 'available') return item.stock > 0;
      if (filter === 'low') return item.stock > 0 && item.stock <= 20;
      return true;
    });
  }, [catalogs, search, filter]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0), [cart]);
  const orderTotal = useMemo(() => orders.reduce((sum, item) => sum + (item.totalPrice ?? item.unitPrice * item.qty), 0), [orders]);

  const addToCart = (product: Catalog) => {
    if (product.stock <= 0) return;
    setCart(current => {
      const existing = current.find(item => item.productId === product.productId);
      if (existing) {
        return current.map(item => item.productId === product.productId
          ? { ...item, qty: Math.min(item.qty + 1, product.stock) }
          : item);
      }
      return [...current, { ...product, qty: 1 }];
    });
    notify('success', `${product.productName}을(를) 장바구니에 담았습니다.`);
  };

  const changeQty = (productId: string, delta: number) => {
    setCart(current => current
      .map(item => item.productId === productId
        ? { ...item, qty: Math.max(0, Math.min(item.stock, item.qty + delta)) }
        : item)
      .filter(item => item.qty > 0));
  };

  const submitLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await run('로그인', () => api.login({
        email: String(fd.get('email')),
        password: String(fd.get('password')),
      }), result => {
        setLogin(result);
        setSelectedUserId(result.userId || selectedUserId);
        sessionStorage.setItem('msa_token', result.token);
        sessionStorage.setItem('msa_userId', result.userId);
      });
      const newUserId = sessionStorage.getItem('msa_userId') || selectedUserId;
      const [, userData] = await Promise.all([
        refreshOrders(newUserId).catch(() => []),
        api.users().catch(() => [] as User[]),
      ]);
      setUsers(userData);
      syncCurrentUserName(userData, newUserId);
      setShowLogin(false);
      notify('success', '로그인되었습니다.');
    } catch {
      // run() already reports the error.
    }
  };

  const logout = () => {
    sessionStorage.removeItem('msa_token');
    sessionStorage.removeItem('msa_userId');
    sessionStorage.removeItem('msa_userName');
    setLogin({ token: '', userId: '' });
    setCurrentUserName('');
    setSelectedUserId('USER-001');
    setOrders([]);
    notify('success', '로그아웃되었습니다.');
  };

  const submitUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await run('회원 등록', () => api.createUser({
        email: String(fd.get('email')),
        name: String(fd.get('name')),
        pwd: String(fd.get('pwd')),
      }));
      { const data = await api.users(); setUsers(data); syncCurrentUserName(data); }
      notify('success', '회원이 등록되었습니다.');
      form.reset();
    } catch { /* handled in run */ }
  };

  const submitCatalog = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await run('상품 등록', () => api.createCatalog({
        productId: String(fd.get('productId')),
        productName: String(fd.get('productName')),
        stock: Number(fd.get('stock')),
        unitPrice: Number(fd.get('unitPrice')),
      }));
      await refreshCatalogs();
      notify('success', '상품이 등록되었습니다.');
      form.reset();
    } catch { /* handled in run */ }
  };

  const checkout = async () => {
    if (!selectedUserId) {
      setShowLogin(true);
      notify('error', '주문할 사용자를 먼저 확인해주세요.');
      return;
    }
    if (!cart.length) return;

    setBusy(true);
    try {
      const results: Order[] = [];
      const kafkaEventIds: string[] = [];
      for (const item of cart) {
        const result = await api.createOrder(selectedUserId, {
          productId: item.productId,
          qty: item.qty,
          unitPrice: item.unitPrice,
        });
        results.push(result.order);
        if (result.kafkaEventId) kafkaEventIds.push(result.kafkaEventId);
      }
      if (kafkaEventIds.length) setFocusedKafkaEventId(kafkaEventIds[kafkaEventIds.length - 1]);
      setLog(`주문 등록 + Kafka 이벤트 발행\n\n${JSON.stringify({ orders: results, kafkaEventIds }, null, 2)}`);
      setCart([]);
      await refreshOrders(selectedUserId);
      await waitForKafka(kafkaEventIds);
      await refreshCatalogs();
      setShowCart(false);
      notify('success', '주문과 Kafka 재고 반영 흐름을 확인하세요.');
      window.setTimeout(() => document.getElementById('kafka-flow')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    } catch (e) {
      setLog(`주문 등록 실패\n\n${toMessage(e)}`);
      notify('error', '주문 등록 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="store-app">
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <div className="top-strip">
        <div className="page-width top-strip-inner">
          <span>Spring Cloud MSA Demo Store</span>
          <div className="app-nav">
            <button className={page === 'shop' ? 'link-button active' : 'link-button'} onClick={() => setPage('shop')}>쇼핑몰</button>
            <button className={page === 'admin' ? 'link-button active' : 'link-button'} onClick={() => setPage('admin')}>관리자</button>
            <button className={page === 'monitor' ? 'link-button active' : 'link-button'} onClick={() => setPage('monitor')}>System Monitor</button>
          </div>
        </div>
      </div>

      <header className="store-header">
        <div className="page-width header-inner">
          <button className="brand" onClick={() => { setPage('shop'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <span className="brand-mark">M</span>
            <span><strong>MSA MARKET</strong><small>microservice commerce</small></span>
          </button>

          {page === 'shop' ? (
            <div className="search-box">
              <span>⌕</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="상품명 또는 상품코드 검색" />
            </div>
          ) : (
            <div className="header-page-title">
              <small>{page === 'admin' ? 'ADMIN CONSOLE' : 'SYSTEM MONITOR'}</small>
              <strong>{page === 'admin' ? '사용자 · 상품 · 주문 관리' : 'Gateway · Kafka · API 관찰'}</strong>
            </div>
          )}

          <nav className="header-actions">
            {login.userId ? (
              <div className="account-chip">
                <span className="avatar">{(currentUserName || '회원').slice(0, 1).toUpperCase()}</span>
                <div><small>로그인</small><strong>{currentUserName || '회원'}</strong></div>
                <button className="icon-button" onClick={logout} title="로그아웃">↪</button>
              </div>
            ) : (
              <button className="account-button" onClick={() => setShowLogin(true)}><span>♙</span> 로그인</button>
            )}
            {page === 'shop' && (
              <button className="cart-button" onClick={() => setShowCart(true)}>
                <span>🛒</span>
                <span>장바구니</span>
                <b>{cartCount}</b>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main>
        {page === 'shop' && <>
        <section className="hero-banner">
          <div className="page-width hero-content">
            <div className="hero-copy">
              <span className="hero-kicker">MSA PORTFOLIO COMMERCE</span>
              <h1>주문부터 재고까지,<br /><em>마이크로서비스로 연결</em></h1>
              <p>React · Spring Cloud Gateway · Eureka · MariaDB 기반 쇼핑몰 데모입니다.<br />모든 프론트엔드 API 요청은 Gateway :8000 단일 진입점을 통과합니다.</p>
              <div className="hero-cta">
                <a href="#products" className="primary-cta">상품 둘러보기</a>
                <button className="secondary-cta" onClick={() => document.getElementById('orders')?.scrollIntoView({ behavior: 'smooth' })}>내 주문내역</button>
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

        <section className="page-width trust-row">
          <div><span>⇢</span><p><strong>Gateway :8000</strong><small>Single Entry Point</small></p></div>
          <div><span>✓</span><p><strong>회원 / JWT</strong><small>User Service</small></p></div>
          <div><span>◫</span><p><strong>상품 / 재고</strong><small>Catalog Service</small></p></div>
          <div><span>◎</span><p><strong>주문 / 내역</strong><small>Order Service</small></p></div>
          <div><span>⚡</span><p><strong>Kafka 이벤트</strong><small>Async Inventory</small></p></div>
        </section>

        <section className="page-width product-section" id="products">
          <div className="section-heading">
            <div><span className="section-kicker">PRODUCTS</span><h2>오늘의 상품</h2><p>MariaDB에 저장된 Catalog 데이터를 실시간으로 조회합니다.</p></div>
            <button className="refresh-button" onClick={() => void refreshCatalogs()} disabled={busy}>↻ 상품 새로고침</button>
          </div>

          <div className="filter-row">
            <button className={filter === 'all' ? 'filter active' : 'filter'} onClick={() => setFilter('all')}>전체 <b>{catalogs.length}</b></button>
            <button className={filter === 'available' ? 'filter active' : 'filter'} onClick={() => setFilter('available')}>구매 가능</button>
            <button className={filter === 'low' ? 'filter active' : 'filter'} onClick={() => setFilter('low')}>재고 임박</button>
          </div>

          {filteredCatalogs.length > 0 ? (
            <div className="product-grid">
              {filteredCatalogs.map((product, index) => {
                const cartItem = cart.find(item => item.productId === product.productId);
                return (
                  <article className="product-card" key={product.productId}>
                    <div className={`product-image image-${index % 6}`}>
                      <span className="product-badge">{product.stock <= 20 ? 'LOW STOCK' : 'NEW'}</span>
                      <div className="product-symbol">{product.productName.slice(0, 1).toUpperCase()}</div>
                      <small>{product.productId}</small>
                    </div>
                    <div className="product-info">
                      <div className="product-meta"><span>MSA MARKET</span><span className={product.stock > 0 ? 'stock' : 'stock soldout'}>{product.stock > 0 ? `재고 ${product.stock}` : '품절'}</span></div>
                      <h3>{product.productName}</h3>
                      <p className="product-code">{product.productId}</p>
                      <div className="price-row"><strong>{money(product.unitPrice)}</strong><small>무료배송</small></div>
                      {cartItem ? (
                        <div className="qty-control">
                          <button onClick={() => changeQty(product.productId, -1)}>−</button>
                          <strong>{cartItem.qty}</strong>
                          <button onClick={() => changeQty(product.productId, 1)}>＋</button>
                          <button className="cart-inline" onClick={() => setShowCart(true)}>장바구니 보기</button>
                        </div>
                      ) : (
                        <button className="add-cart" disabled={product.stock <= 0 || busy} onClick={() => addToCart(product)}>
                          <span>🛒</span> 장바구니 담기
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state"><span>⌕</span><strong>조건에 맞는 상품이 없습니다.</strong><small>검색어나 필터를 변경해보세요.</small></div>
          )}
        </section>

        <KafkaFlow
          events={kafkaEvents}
          autoRefresh={kafkaAutoRefresh}
          focusEventId={focusedKafkaEventId}
          onToggleAutoRefresh={() => setKafkaAutoRefresh(v => !v)}
          onRefresh={() => void refreshKafkaEvents()}
          onClear={() => void api.clearKafkaEvents().then(() => { setKafkaEvents([]); setFocusedKafkaEventId(''); notify('success', 'Kafka 이벤트 로그를 초기화했습니다.'); }).catch(() => notify('error', 'Kafka 로그 초기화에 실패했습니다.'))}
        />

        <section className="order-section" id="orders">
          <div className="page-width">
            <div className="section-heading light">
              <div><span className="section-kicker">MY ORDERS</span><h2>최근 주문내역</h2><p>{currentUserName || '로그인 사용자'}님의 최근 주문내역입니다.</p></div>
              <button className="refresh-button light-button" onClick={() => void refreshOrders()} disabled={busy}>↻ 주문 새로고침</button>
            </div>

            <div className="order-summary-grid">
              <div className="summary-card"><small>주문 건수</small><strong>{orders.length}</strong><span>orders</span></div>
              <div className="summary-card"><small>총 주문금액</small><strong>{money(orderTotal)}</strong><span>누적</span></div>
              <div className="summary-card"><small>현재 사용자</small><strong className="summary-user">{currentUserName || '-'}</strong><span>User Service</span></div>
            </div>

            <div className="order-list">
              {orders.length ? orders.map((order, i) => (
                <article className="order-card" key={order.orderId ?? i}>
                  <div className="order-icon">◫</div>
                  <div className="order-main">
                    <div className="order-title"><strong>{order.productId}</strong><span>주문완료</span></div>
                    <p>{order.orderId ?? 'Order ID 생성됨'}</p>
                    <small>{fmt(order.createdAt)}</small>
                  </div>
                  <div className="order-qty"><small>수량</small><strong>{order.qty}</strong></div>
                  <div className="order-price"><small>결제금액</small><strong>{money(order.totalPrice ?? order.unitPrice * order.qty)}</strong></div>
                </article>
              )) : (
                <div className="empty-order"><strong>아직 주문내역이 없습니다.</strong><span>상품을 장바구니에 담아 첫 주문을 만들어보세요.</span></div>
              )}
            </div>
          </div>
        </section>
        </>}

        {page === 'admin' && (
          <AdminConsole
            loggedInUserId={login.userId}
            onDataChanged={() => {
              void api.users().then(data => { setUsers(data); syncCurrentUserName(data, selectedUserId); }).catch(() => undefined);
              void refreshCatalogs().catch(() => undefined);
              if (selectedUserId) void refreshOrders(selectedUserId).catch(() => undefined);
            }}
            onLog={setLog}
            onKafkaEvent={(eventId) => {
              setFocusedKafkaEventId(eventId);
              void refreshKafkaEvents().catch(() => undefined);
              notify('success', '주문 취소 이벤트가 발행되었습니다. System Monitor에서 재고 복원 흐름을 확인할 수 있습니다.');
            }}
          />
        )}

        {page === 'monitor' && (
          <SystemMonitor
            health={health}
            events={kafkaEvents}
            autoRefresh={kafkaAutoRefresh}
            focusEventId={focusedKafkaEventId}
            apiLog={log}
            token={login.token}
            onRefreshHealth={() => void loadHealth()}
            onRefreshKafka={() => void refreshKafkaEvents()}
            onClearKafka={() => void api.clearKafkaEvents().then(() => { setKafkaEvents([]); setFocusedKafkaEventId(''); notify('success', 'Kafka 이벤트 로그를 초기화했습니다.'); }).catch(() => notify('error', 'Kafka 로그 초기화에 실패했습니다.'))}
            onToggleKafka={() => setKafkaAutoRefresh(v => !v)}
          />
        )}
      </main>

      <footer className="store-footer">
        <div className="page-width footer-inner">
          <div><strong>MSA MARKET</strong><p>React + TypeScript · Gateway · Eureka · Spring Boot · Kafka · MariaDB</p></div>
          <div className="footer-services">{['Gateway', 'User', 'Catalog', 'Order'].map(name => <span key={name}><i className={!health[name]?.startsWith('ERROR') ? 'online' : 'offline'} />{name}</span>)}</div>
        </div>
      </footer>

      {showLogin && (
        <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowLogin(false); }}>
          <div className="modal login-modal">
            <button className="modal-close" onClick={() => setShowLogin(false)}>×</button>
            <div className="modal-brand"><span className="brand-mark">M</span><div><strong>MSA MARKET</strong><small>로그인</small></div></div>
            <h2>다시 만나서 반갑습니다.</h2><p>테스트 계정으로 로그인하고 주문 흐름을 확인하세요.</p>
            <form onSubmit={submitLogin}>
              <label>이메일<input name="email" type="email" defaultValue="test@test.com" required /></label>
              <label>비밀번호<input name="password" type="password" defaultValue="test1234" required /></label>
              <button type="submit" className="login-submit" disabled={busy}>{busy ? '처리 중...' : '로그인'}</button>
            </form>
            <div className="demo-account"><span>DEMO</span><p><strong>test@test.com</strong><small>password · test1234</small></p></div>
          </div>
        </div>
      )}

      {showCart && (
        <div className="overlay cart-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setShowCart(false); }}>
          <aside className="cart-drawer">
            <div className="cart-head"><div><span>SHOPPING CART</span><h2>장바구니 <b>{cartCount}</b></h2></div><button onClick={() => setShowCart(false)}>×</button></div>
            <div className="cart-items">
              {cart.length ? cart.map(item => (
                <article className="cart-item" key={item.productId}>
                  <div className="cart-thumb">{item.productName.slice(0, 1).toUpperCase()}</div>
                  <div className="cart-product"><strong>{item.productName}</strong><small>{item.productId}</small><span>{money(item.unitPrice)}</span></div>
                  <div className="cart-qty"><button onClick={() => changeQty(item.productId, -1)}>−</button><strong>{item.qty}</strong><button onClick={() => changeQty(item.productId, 1)}>＋</button></div>
                </article>
              )) : <div className="cart-empty"><span>🛒</span><strong>장바구니가 비어 있습니다.</strong><small>상품을 선택해 담아보세요.</small></div>}
            </div>
            <div className="cart-footer">
              <div className="checkout-user"><span>주문 사용자</span><strong>{currentUserName || '로그인 필요'}</strong></div>
              <div className="checkout-total"><span>총 결제금액</span><strong>{money(cartTotal)}</strong></div>
              <button className="checkout-button" onClick={() => void checkout()} disabled={!cart.length || busy}>{busy ? '주문 처리 중...' : `${money(cartTotal)} 주문하기`}</button>
              <p>주문 저장 후 Kafka 이벤트가 발행되고 Catalog Consumer가 비동기로 재고를 차감합니다. 주문 완료 후 Kafka Live Flow로 이동합니다.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
