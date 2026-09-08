export interface User {
  email: string;
  name: string;
  userId: string;
  orders?: Order[];
}

export interface UserCreateRequest {
  email: string;
  name: string;
  pwd: string;
}

export interface UserUpdateRequest {
  email?: string;
  name?: string;
  pwd?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Catalog {
  productId: string;
  productName: string;
  unitPrice: number;
  stock: number;
  createdAt?: string;
}

export interface CatalogCreateRequest {
  productId: string;
  productName: string;
  unitPrice: number;
  stock: number;
}

export interface CatalogUpdateRequest {
  productName?: string;
  unitPrice?: number;
  stock?: number;
}

export interface Order {
  productId: string;
  qty: number;
  unitPrice: number;
  totalPrice?: number;
  createdAt?: string;
  orderId?: string;
  userId?: string;
}

export interface AdminOrder extends Order {
  orderId: string;
  userId: string;
}

export interface OrderCreateRequest {
  productId: string;
  qty: number;
  unitPrice: number;
}

export interface LoginResult {
  token: string;
  userId: string;
}

export interface KafkaEventLog {
  id: number;
  eventId: string;
  stage: 'ORDER_STORED' | 'PRODUCER_SEND' | 'BROKER_ACK' | 'CONSUMED' | 'INVENTORY_UPDATED' | 'PRODUCER_ERROR' | 'CONSUMER_ERROR' | string;
  eventType: string;
  topic?: string;
  partitionNo?: number | null;
  offsetNo?: number | null;
  producer?: string;
  consumer?: string;
  messageKey?: string;
  orderId?: string;
  productId?: string;
  beforeStock?: number | null;
  afterStock?: number | null;
  status: string;
  errorMessage?: string | null;
  payload?: string;
  createdAt?: string;
}

export interface OrderCreateResult {
  order: Order;
  kafkaEventId: string;
}
