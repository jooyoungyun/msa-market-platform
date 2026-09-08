import axios from 'axios';
import type {
  AdminOrder,
  Catalog,
  CatalogCreateRequest,
  CatalogUpdateRequest,
  LoginRequest,
  LoginResult,
  KafkaEventLog,
  Order,
  OrderCreateRequest,
  OrderCreateResult,
  User,
  UserCreateRequest,
  UserUpdateRequest,
} from '@/types/api';

const http = axios.create({ timeout: 7000 });

http.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = window.sessionStorage.getItem('msa_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const toMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data;
    if (typeof body === 'string') return body;
    if (body) return JSON.stringify(body, null, 2);
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
};

export const api = {
  async healthGateway() {
    const response = await http.get<{ status?: string }>('/api/actuator/health');
    return `Gateway ${response.data.status ?? 'UNKNOWN'}`;
  },
  async healthUser() { return (await http.get<string>('/api/user-service/health_check')).data; },
  async healthCatalog() { return (await http.get<string>('/api/catalog-service/health_check')).data; },
  async healthOrder() { return (await http.get<string>('/api/order-service/health_check')).data; },

  async users() { return (await http.get<User[]>('/api/user-service/users')).data; },
  async createUser(body: UserCreateRequest) { return (await http.post<User>('/api/user-service/users', body)).data; },
  async updateUser(userId: string, body: UserUpdateRequest) {
    return (await http.put<User>(`/api/user-service/users/${encodeURIComponent(userId)}`, body)).data;
  },
  async deleteUser(userId: string) { await http.delete(`/api/user-service/users/${encodeURIComponent(userId)}`); },
  async login(body: LoginRequest): Promise<LoginResult> {
    const response = await http.post('/api/user-service/login', body, { validateStatus: s => s >= 200 && s < 400 });
    const token = response.headers['token'] ?? '';
    const userId = response.headers['userid'] ?? response.headers['userId'] ?? '';
    const role = response.headers['role'] ?? 'ROLE_USER';
    const encodedUserName = response.headers['username'] ?? '';
    const userName = encodedUserName ? decodeURIComponent(String(encodedUserName).replace(/\+/g, ' ')) : '';
    if (!token) throw new Error('로그인은 성공했지만 response header에서 token을 찾지 못했습니다.');
    return { token, userId, role, userName };
  },

  async catalogs() { return (await http.get<Catalog[]>('/api/catalog-service/catalogs')).data; },
  async createCatalog(body: CatalogCreateRequest) { return (await http.post<Catalog>('/api/catalog-service/catalogs', body)).data; },
  async updateCatalog(productId: string, body: CatalogUpdateRequest) {
    return (await http.put<Catalog>(`/api/catalog-service/catalogs/${encodeURIComponent(productId)}`, body)).data;
  },
  async deleteCatalog(productId: string) { await http.delete(`/api/catalog-service/catalogs/${encodeURIComponent(productId)}`); },

  async orders(userId: string) { return (await http.get<Order[]>(`/api/order-service/${encodeURIComponent(userId)}/orders`)).data; },
  async allOrders() { return (await http.get<AdminOrder[]>('/api/order-service/orders')).data; },
  async deleteOrder(orderId: string) {
    const response = await http.delete(`/api/order-service/orders/${encodeURIComponent(orderId)}`);
    return response.headers['x-kafka-event-id'] ?? '';
  },
  async createOrder(userId: string, body: OrderCreateRequest): Promise<OrderCreateResult> {
    const response = await http.post<Order>(`/api/order-service/${encodeURIComponent(userId)}/orders`, body);
    return { order: response.data, kafkaEventId: response.headers['x-kafka-event-id'] ?? '' };
  },

  async kafkaEvents(limit = 100) {
    return (await http.get<KafkaEventLog[]>('/api/catalog-service/kafka/events', { params: { limit } })).data;
  },
  async clearKafkaEvents() { await http.delete('/api/catalog-service/kafka/events'); },
};
