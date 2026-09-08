'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, toMessage } from '@/lib/api';
import type { Catalog, KafkaEventLog, LoginRequest, LoginResult, Order, User } from '@/types/api';

type CartItem = Catalog & { qty: number };
type Toast = { type: 'success' | 'error'; message: string } | null;

type MarketContextValue = {
  users: User[];
  catalogs: Catalog[];
  orders: Order[];
  cart: CartItem[];
  health: Record<string, string>;
  login: LoginResult;
  currentUserName: string;
  busy: boolean;
  apiLog: string;
  kafkaEvents: KafkaEventLog[];
  kafkaAutoRefresh: boolean;
  focusedKafkaEventId: string;
  toast: Toast;
  cartCount: number;
  cartTotal: number;
  orderTotal: number;
  refreshUsers: () => Promise<User[]>;
  refreshCatalogs: () => Promise<Catalog[]>;
  refreshOrders: (userId?: string) => Promise<Order[]>;
  refreshKafkaEvents: () => Promise<KafkaEventLog[]>;
  loadHealth: () => Promise<void>;
  clearKafkaEvents: () => Promise<void>;
  loginUser: (body: LoginRequest) => Promise<LoginResult>;
  logout: () => void;
  addToCart: (product: Catalog) => void;
  changeQty: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  checkout: () => Promise<string[]>;
  setApiLog: (text: string) => void;
  setFocusedKafkaEventId: (eventId: string) => void;
  setKafkaAutoRefresh: (value: boolean | ((prev: boolean) => boolean)) => void;
  notify: (type: 'success' | 'error', message: string) => void;
};

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [health, setHealth] = useState<Record<string, string>>({});
  const [login, setLogin] = useState<LoginResult>({ token: '', userId: '' });
  const [currentUserName, setCurrentUserName] = useState('');
  const [busy, setBusy] = useState(false);
  const [apiLog, setApiLog] = useState('아직 실행된 API가 없습니다.');
  const [kafkaEvents, setKafkaEvents] = useState<KafkaEventLog[]>([]);
  const [kafkaAutoRefresh, setKafkaAutoRefresh] = useState(true);
  const [focusedKafkaEventId, setFocusedKafkaEventIdState] = useState('');
  const [toast, setToast] = useState<Toast>(null);

  const notify = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const syncUserName = useCallback((items: User[], userId: string) => {
    const name = items.find(v => v.userId === userId)?.name ?? '';
    setCurrentUserName(name);
    if (name) window.sessionStorage.setItem('msa_userName', name);
    else window.sessionStorage.removeItem('msa_userName');
    return name;
  }, []);

  const refreshUsers = useCallback(async () => {
    const data = await api.users();
    setUsers(data);
    const userId = window.sessionStorage.getItem('msa_userId') ?? '';
    if (userId) syncUserName(data, userId);
    return data;
  }, [syncUserName]);

  const refreshCatalogs = useCallback(async () => {
    const data = await api.catalogs();
    setCatalogs(data);
    return data;
  }, []);

  const refreshOrders = useCallback(async (userId?: string) => {
    const resolved = userId ?? window.sessionStorage.getItem('msa_userId') ?? '';
    if (!resolved) {
      setOrders([]);
      return [];
    }
    const data = await api.orders(resolved);
    setOrders(data);
    return data;
  }, []);

  const refreshKafkaEvents = useCallback(async () => {
    const data = await api.kafkaEvents(150);
    setKafkaEvents(data);
    return data;
  }, []);

  const loadHealth = useCallback(async () => {
    const entries = await Promise.all([
      api.healthGateway().then(v => ['Gateway', v] as const).catch(e => ['Gateway', `ERROR: ${toMessage(e)}`] as const),
      api.healthUser().then(v => ['User', v] as const).catch(e => ['User', `ERROR: ${toMessage(e)}`] as const),
      api.healthCatalog().then(v => ['Catalog', v] as const).catch(e => ['Catalog', `ERROR: ${toMessage(e)}`] as const),
      api.healthOrder().then(v => ['Order', v] as const).catch(e => ['Order', `ERROR: ${toMessage(e)}`] as const),
    ]);
    setHealth(Object.fromEntries(entries));
  }, []);

  const setFocusedKafkaEventId = useCallback((eventId: string) => {
    setFocusedKafkaEventIdState(eventId);
    if (eventId) window.sessionStorage.setItem('msa_kafka_focus', eventId);
    else window.sessionStorage.removeItem('msa_kafka_focus');
  }, []);

  useEffect(() => {
    const token = window.sessionStorage.getItem('msa_token') ?? '';
    const userId = window.sessionStorage.getItem('msa_userId') ?? '';
    const userName = window.sessionStorage.getItem('msa_userName') ?? '';
    const savedCart = window.sessionStorage.getItem('msa_cart');
    const focus = window.sessionStorage.getItem('msa_kafka_focus') ?? '';

    setLogin({ token, userId });
    setCurrentUserName(userName);
    setFocusedKafkaEventIdState(focus);
    if (savedCart) {
      try { setCart(JSON.parse(savedCart) as CartItem[]); } catch { window.sessionStorage.removeItem('msa_cart'); }
    }

    void loadHealth();
    void refreshCatalogs().catch(() => undefined);
    void refreshKafkaEvents().catch(() => undefined);
    if (token && userId) {
      void refreshUsers().catch(() => undefined);
      void refreshOrders(userId).catch(() => undefined);
    }
  }, [loadHealth, refreshCatalogs, refreshKafkaEvents, refreshOrders, refreshUsers]);

  useEffect(() => {
    window.sessionStorage.setItem('msa_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!kafkaAutoRefresh) return;
    const timer = window.setInterval(() => void refreshKafkaEvents().catch(() => undefined), 1500);
    return () => window.clearInterval(timer);
  }, [kafkaAutoRefresh, refreshKafkaEvents]);

  const loginUser = useCallback(async (body: LoginRequest) => {
    setBusy(true);
    try {
      const result = await api.login(body);
      window.sessionStorage.setItem('msa_token', result.token);
      window.sessionStorage.setItem('msa_userId', result.userId);
      setLogin(result);
      const [userData] = await Promise.all([
        api.users().catch(() => [] as User[]),
        refreshOrders(result.userId).catch(() => []),
      ]);
      setUsers(userData);
      syncUserName(userData, result.userId);
      setApiLog(`로그인 성공\n\nuserId=${result.userId}\ntoken=${result.token.slice(0, 40)}...`);
      notify('success', '로그인되었습니다.');
      return result;
    } catch (e) {
      const message = toMessage(e);
      setApiLog(`로그인 실패\n\n${message}`);
      notify('error', '로그인에 실패했습니다.');
      throw e;
    } finally {
      setBusy(false);
    }
  }, [notify, refreshOrders, syncUserName]);

  const logout = useCallback(() => {
    ['msa_token', 'msa_userId', 'msa_userName'].forEach(key => window.sessionStorage.removeItem(key));
    setLogin({ token: '', userId: '' });
    setCurrentUserName('');
    setUsers([]);
    setOrders([]);
    notify('success', '로그아웃되었습니다.');
  }, [notify]);

  const addToCart = useCallback((product: Catalog) => {
    if (product.stock <= 0) return;
    setCart(current => {
      const existing = current.find(v => v.productId === product.productId);
      if (existing) return current.map(v => v.productId === product.productId ? { ...v, qty: Math.min(v.qty + 1, product.stock) } : v);
      return [...current, { ...product, qty: 1 }];
    });
    notify('success', `${product.productName}을(를) 장바구니에 담았습니다.`);
  }, [notify]);

  const changeQty = useCallback((productId: string, delta: number) => {
    setCart(current => current
      .map(v => v.productId === productId ? { ...v, qty: Math.max(0, Math.min(v.stock, v.qty + delta)) } : v)
      .filter(v => v.qty > 0));
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(current => current.filter(v => v.productId !== productId));
  }, []);

  const waitForKafka = useCallback(async (eventIds: string[]) => {
    const targets = eventIds.filter(Boolean);
    if (!targets.length) return;
    for (let i = 0; i < 12; i += 1) {
      const data = await refreshKafkaEvents().catch(() => [] as KafkaEventLog[]);
      const finished = targets.every(eventId => data.some(event => event.eventId === eventId && (
        event.stage === 'INVENTORY_UPDATED' || event.stage === 'INVENTORY_RESTORED' || event.status === 'ERROR'
      )));
      if (finished) return;
      await new Promise(resolve => window.setTimeout(resolve, 400));
    }
  }, [refreshKafkaEvents]);

  const checkout = useCallback(async () => {
    const userId = login.userId || window.sessionStorage.getItem('msa_userId') || '';
    if (!userId) {
      notify('error', '로그인 후 주문할 수 있습니다.');
      throw new Error('LOGIN_REQUIRED');
    }
    if (!cart.length) return [];

    setBusy(true);
    try {
      const results: Order[] = [];
      const eventIds: string[] = [];
      for (const item of cart) {
        const result = await api.createOrder(userId, { productId: item.productId, qty: item.qty, unitPrice: item.unitPrice });
        results.push(result.order);
        if (result.kafkaEventId) eventIds.push(result.kafkaEventId);
      }
      if (eventIds.length) setFocusedKafkaEventId(eventIds[eventIds.length - 1]);
      setApiLog(`주문 등록 + Kafka 이벤트 발행\n\n${JSON.stringify({ orders: results, kafkaEventIds: eventIds }, null, 2)}`);
      setCart([]);
      await refreshOrders(userId);
      await waitForKafka(eventIds);
      await refreshCatalogs();
      notify('success', '주문이 완료되었습니다. Kafka 재고 반영도 확인해보세요.');
      return eventIds;
    } catch (e) {
      setApiLog(`주문 등록 실패\n\n${toMessage(e)}`);
      notify('error', '주문 등록 중 오류가 발생했습니다.');
      throw e;
    } finally {
      setBusy(false);
    }
  }, [cart, login.userId, notify, refreshCatalogs, refreshOrders, setFocusedKafkaEventId, waitForKafka]);

  const clearKafkaEvents = useCallback(async () => {
    await api.clearKafkaEvents();
    setKafkaEvents([]);
    setFocusedKafkaEventId('');
    notify('success', 'Kafka 이벤트 로그를 초기화했습니다.');
  }, [notify, setFocusedKafkaEventId]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0), [cart]);
  const orderTotal = useMemo(() => orders.reduce((sum, item) => sum + (item.totalPrice ?? item.qty * item.unitPrice), 0), [orders]);

  const value = useMemo<MarketContextValue>(() => ({
    users, catalogs, orders, cart, health, login, currentUserName, busy, apiLog, kafkaEvents, kafkaAutoRefresh,
    focusedKafkaEventId, toast, cartCount, cartTotal, orderTotal,
    refreshUsers, refreshCatalogs, refreshOrders, refreshKafkaEvents, loadHealth, clearKafkaEvents,
    loginUser, logout, addToCart, changeQty, removeFromCart, checkout, setApiLog, setFocusedKafkaEventId,
    setKafkaAutoRefresh, notify,
  }), [
    users, catalogs, orders, cart, health, login, currentUserName, busy, apiLog, kafkaEvents, kafkaAutoRefresh,
    focusedKafkaEventId, toast, cartCount, cartTotal, orderTotal, refreshUsers, refreshCatalogs, refreshOrders,
    refreshKafkaEvents, loadHealth, clearKafkaEvents, loginUser, logout, addToCart, changeQty, removeFromCart,
    checkout, setFocusedKafkaEventId, notify,
  ]);

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const value = useContext(MarketContext);
  if (!value) throw new Error('useMarket must be used inside MarketProvider');
  return value;
}
