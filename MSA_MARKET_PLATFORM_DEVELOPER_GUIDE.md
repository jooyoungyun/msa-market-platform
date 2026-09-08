# MSA Market Platform 개발자 가이드

> Repository: https://github.com/jooyoungyun/msa-market-platform  
> 기준 시점: 2026-09-08  
> 목적: Spring Cloud 기반 강의용 MSA 예제를 분석하고, 실제 포트폴리오형 E-Commerce MSA 플랫폼으로 확장한 현재 상태를 개발자 관점에서 정리한다.

---

## 1. 프로젝트 개요

본 프로젝트는 기존 Spring Cloud 강의 예제를 기반으로 다음 영역을 단계적으로 확장한 프로젝트다.

### AS-IS

- Spring Boot / Spring Cloud 교육용 예제
- Eureka 기반 Service Discovery
- API Gateway 예제
- User / Catalog / Order 서비스 분리
- H2 기반 데이터 저장
- Kafka 일부 예제 코드
- 예외/장애 테스트용 코드 포함
- 별도 사용자 UI 없음
- 운영 관점의 로그/모니터링 기능 부족

### TO-BE 현재 상태

- MariaDB 기반 영속 데이터 저장
- Spring Cloud Gateway 중심 단일 진입점
- JWT 로그인 및 Gateway 인증
- User / Product / Order 관리 기능
- Kafka 기반 주문/재고 이벤트 처리
- 주문 취소 시 재고 복원 이벤트 처리
- Kafka Event Flow Monitor
- 관리자 화면
- Next.js 기반 사용자/관리자 UI
- System Monitor
- ELK 로그 수집 구조 1차 적용 시작

---

## 2. 전체 아키텍처

```text
                        ┌─────────────────────┐
                        │      Next.js        │
                        │       :3000         │
                        └─────────┬───────────┘
                                  │
                               /api/*
                                  │
                                  ▼
                        ┌─────────────────────┐
                        │  API Gateway :8000  │
                        └─────────┬───────────┘
                                  │
                                  ▼
                        ┌─────────────────────┐
                        │ Eureka Server :8761 │
                        └─────────────────────┘

              ┌────────────────┬────────────────┬────────────────┐
              │                │                │
              ▼                ▼                ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │ User Service │ │Order Service │ │Catalog Svc   │
      │    :9001     │ │    :9003     │ │    :9002     │
      └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
             │                │                  │
             └────────┬───────┴──────────┬───────┘
                      │                  │
                      ▼                  ▼
               ┌─────────────┐     ┌─────────────┐
               │  MariaDB    │     │    Kafka    │
               │ msa_ecommerce│    │    :9092    │
               └─────────────┘     └─────────────┘
                                          │
                                          ▼
                                  Catalog 재고 반영
```

ELK 1차 구조:

```text
Spring Boot Services
        │
        │ ECS JSON Log
        ▼
   logs/*.json
        │
        ▼
     Filebeat
        │
        ▼
     Logstash
        │
        ▼
  Elasticsearch
        │
        ▼
      Kibana
```

---

## 3. 주요 서비스

| 서비스 | 포트 | 역할 |
|---|---:|---|
| discoveryservice | 8761 | Eureka Service Registry |
| apigateway-service | 8000 | 단일 진입점, Route, JWT 검증 |
| user-service | 9001 | 회원가입, 로그인, 사용자 관리 |
| catalog-service | 9002 | 상품 관리, 재고 관리, Kafka Consumer |
| order-service | 9003 | 주문 관리, Kafka Producer |
| Next.js Frontend | 3000 | 사용자/관리자/System Monitor UI |
| Kafka | 9092 | 주문/재고 이벤트 Broker |
| MariaDB | 3306 | 서비스 데이터 저장 |
| Elasticsearch | 9200 | 로그 저장/검색 |
| Kibana | 5601 | 로그 조회/분석 |

---

## 4. 개발 환경

### Java

본 프로젝트는 레거시 Spring Boot / Spring Cloud 조합이므로 **JDK 11 사용을 권장한다.**

확인:

```powershell
java -version
```

정상 예:

```text
openjdk version "11.0.31"
```

Maven Wrapper 확인:

```powershell
.\mvnw.cmd -v
```

정상 예:

```text
Java version: 11.0.31
Java home: C:\Program Files\Java\jdk-11.0.31
```

### 중요

실행 JDK와 Maven 빌드 JDK가 다를 수 있다.

IntelliJ에서 아래 설정도 JDK 11로 맞춘다.

```text
File
 → Project Structure
 → Project SDK
 → JDK 11
```

```text
Settings
 → Build Tools
 → Maven
 → Runner
 → JRE
 → JDK 11
```

```text
Settings
 → Build Tools
 → Maven
 → Importing
 → JDK for importer
 → JDK 11
```

---

## 5. Java 25 사용 시 발생했던 오류

발생 오류:

```text
java.lang.ExceptionInInitializerError
com.sun.tools.javac.code.TypeTag :: UNKNOWN
```

원인:

- 기존 프로젝트의 Lombok 버전은 1.18.16
- Java 25의 javac 내부 구조와 호환되지 않음
- Annotation Processing 단계에서 오류 발생

해결:

- 프로젝트 전체 빌드/실행 JDK를 Java 11로 통일

환경 변수 예:

```text
JAVA_HOME=C:\Program Files\Java\jdk-11.0.31
```

Path:

```text
%JAVA_HOME%\bin
```

---

## 6. MariaDB 적용

기존 H2 중심 구조에서 MariaDB로 변경하였다.

### 기본 DB

```text
DB Name : msa_ecommerce
User    : msa
Password: msa1234
Port    : 3306
```

> Public Repository 기준에서는 실제 비밀번호를 환경변수로 변경하는 것이 권장된다.

예:

```yaml
spring:
  datasource:
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
```

---

## 7. User Service

### 주요 기능

- 회원가입
- 로그인
- JWT 발급
- 사용자 목록
- 사용자 수정
- 사용자 삭제
- 사용자 주문 조회 연동

### 로그인 흐름

`/login`은 일반 Controller가 아니라 `UsernamePasswordAuthenticationFilter` 기반으로 처리한다.

```text
POST /login
   │
   ▼
AuthenticationFilter
   │
   ▼
AuthenticationManager
   │
   ▼
UserDetailsService
   │
   ▼
successfulAuthentication()
   │
   ├─ JWT 생성
   ├─ token Header
   └─ userId Header
```

---

## 8. API Gateway

Gateway는 Frontend의 단일 Backend 진입점 역할을 한다.

```text
Next.js
   │
   ▼
Gateway :8000
   │
   ├─ User Service
   ├─ Catalog Service
   └─ Order Service
```

JWT가 필요한 API에서는:

```http
Authorization: Bearer {token}
```

형태로 전달한다.

Frontend는 직접 9001/9002/9003으로 호출하지 않고 Gateway를 통해 호출하도록 구성한다.

---

## 9. Catalog Service

### 주요 기능

- 상품 목록
- 상품 등록
- 상품 수정
- 상품 삭제
- Kafka Consumer
- 재고 차감
- 주문 취소 시 재고 복원

### ModelMapper 오류

상품 생성 시 다음 오류가 발생한 적이 있다.

```text
Converter NumberConverter failed to convert java.lang.String to java.lang.Long
```

원인:

- DTO의 `productId`는 String
- Entity 내부 Long `id`와 ModelMapper가 자동 매핑을 시도

해결:

상품 등록은 명시적 수동 매핑을 사용한다.

```java
CatalogEntity entity = new CatalogEntity();
entity.setProductId(request.getProductId());
entity.setProductName(request.getProductName());
entity.setStock(request.getStock());
entity.setUnitPrice(request.getUnitPrice());
```

레거시 DTO/Entity 구조에서는 자동 매핑보다 명시적 매핑이 안전하다.

---

## 10. Order Service

### 주요 기능

- 주문 생성
- 주문 목록
- 관리자 전체 주문 조회
- 주문 삭제/취소
- Kafka Producer
- Kafka Event Log 기록

기존 강의 소스에 존재했던 장애 테스트용 예외:

```java
Thread.sleep(1000);
throw new Exception("장애 발생");
```

는 실제 데모 동작을 위해 제거하였다.

---

## 11. Kafka 주문 이벤트

Kafka Topic:

```text
example-catalog-topic
```

### 주문 생성

```text
Order 생성
   │
   ▼
Order DB 저장
   │
   ▼
Kafka Producer
   │
   ▼
ORDER_CREATED
   │
   ▼
Kafka Broker
   │
   ▼
Catalog Consumer
   │
   ▼
재고 감소
```

예:

```text
stock = 100
order qty = 2

100 → 98
```

### 주문 취소

```text
Admin 주문 취소
   │
   ▼
ORDER_CANCELLED
   │
   ▼
Kafka Broker
   │
   ▼
Catalog Consumer
   │
   ▼
재고 복원
```

예:

```text
98 → 100
```

---

## 12. Kafka Flow Monitor

Kafka 흐름을 단순 애니메이션으로 표시하지 않고 실제 Kafka 메타데이터를 저장하도록 구성했다.

사용 메타데이터:

- eventId
- topic
- partition
- offset
- consumerGroup
- orderId
- productId
- beforeStock
- afterStock
- payload
- status
- createdAt

주요 Stage:

```text
ORDER_STORED
      ↓
PRODUCER_SEND
      ↓
BROKER_ACK
      ↓
CONSUMED
      ↓
INVENTORY_UPDATED
```

취소 이벤트:

```text
ORDER_CANCELLED
      ↓
BROKER_ACK
      ↓
CONSUMED
      ↓
INVENTORY_RESTORED
```

Frontend는 주문 응답 Header의:

```text
X-Kafka-Event-Id
```

를 이용해 해당 이벤트 흐름을 추적한다.

---

## 13. Next.js Frontend

Frontend는 기존 Vite React 기반 테스트 UI에서 Next.js App Router 구조로 전환하였다.

기본 포트:

```text
3000
```

Gateway:

```text
8000
```

### Gateway Rewrite

Next.js:

```text
/api/*
```

호출을 Gateway로 전달한다.

```text
/api/*
  ↓
http://127.0.0.1:8000/*
```

---

## 14. Next.js 구조

대표 Route:

```text
/
├─ products
├─ cart
├─ orders
├─ login
├─ admin
│  ├─ users
│  ├─ products
│  └─ orders
└─ monitor
   ├─ kafka
   └─ services
```

### 메인 페이지

`app/page.tsx`는 Route 역할만 한다.

```tsx
import HomePage from '@/components/home/HomePage';

export default function Page() {
    return <HomePage />;
}
```

실제 메인 UI:

```text
components/home
├─ HomePage
├─ HeroSection
├─ ServiceTrustSection
├─ FeaturedProductsSection
└─ FeatureNavigationSection
```

### App.tsx

기존 Vite 시절 `App.tsx`에 많은 화면/상태 로직이 있었으나 현재는 최소화하였다.

```tsx
import HomePage from '@/components/home/HomePage';

export default function App() {
    return <HomePage />;
}
```

Next.js App Router에서는 실제 진입점이 아니므로 향후 Vite 잔재 정리 시 삭제 가능하다.

---

## 15. Frontend 상태 관리

공통 상태는 `MarketProvider`에서 관리한다.

대표 상태:

- 로그인
- JWT
- userId
- userName
- 상품
- 장바구니
- 주문
- Kafka Flow
- 서비스 상태
- API Debug 정보

인증 관련 정보는 `sessionStorage`를 활용하여 Route 이동 시 유지한다.

---

## 16. 관리자 기능

현재 관리자 UI에서 다음 기능을 제공한다.

### User

- 목록
- 등록
- 수정
- 삭제

### Product

- 목록
- 등록
- 수정
- 삭제

### Order

- 전체 주문 조회
- 주문 취소/삭제

주문 취소 시 Kafka 이벤트를 통해 재고가 복원된다.

---

## 17. System Monitor

기존 Developer Tools라는 명칭은 사용자 기능과 혼동 가능성이 있어 다음 개념으로 정리하였다.

```text
System Monitor
Developer Console
```

주요 대상:

- 서비스 상태
- API 호출 결과
- JWT
- Kafka Flow
- 이벤트 메타데이터
- 시스템 확인용 Debug 정보

---

# 18. ELK 적용 - 현재 단계

이번 단계에서는 Next.js UI에 ELK 기능을 연결하지 않고 로그 수집 인프라만 분리해서 적용한다.

구조:

```text
Spring Boot
   │
   │ JSON Log
   ▼
Filebeat
   │
   ▼
Logstash
   │
   ▼
Elasticsearch
   │
   ▼
Kibana
```

적용 대상:

```text
apigateway-service
user-service
catalog-service
order-service
```

---

## 19. ECS JSON Logging

Spring Boot 서비스에서 사람이 읽는 Console 로그는 유지하고, 별도의 JSON 로그 파일을 생성하도록 구성한다.

예상 파일:

```text
user-service/logs/user-service.json
catalog-service/logs/catalog-service.json
order-service/logs/order-service.json
apigateway-service/logs/apigateway-service.json
```

---

## 20. ECS Encoder Dependency

`logback-spring.xml`에서 아래 Encoder를 사용한다.

```text
co.elastic.logging.logback.EcsEncoder
```

따라서 각 서비스 `pom.xml`에 반드시 다음 Dependency가 존재해야 한다.

```xml
<dependency>
    <groupId>co.elastic.logging</groupId>
    <artifactId>logback-ecs-encoder</artifactId>
    <version>1.8.0</version>
</dependency>
```

적용 대상:

```text
user-service/pom.xml
catalog-service/pom.xml
order-service/pom.xml
apigateway-service/pom.xml
```

---

## 21. ELK 적용 중 발생한 User Service 오류

발생 오류:

```text
ClassNotFoundException:
co.elastic.logging.logback.EcsEncoder
```

뒤이어:

```text
no applicable action for [serviceName]
no applicable action for [serviceVersion]
no applicable action for [serviceEnvironment]
No encoder set for the appender
```

오류가 연쇄적으로 발생하였다.

### 원인

`logback-spring.xml`은 적용되었으나 Maven 실행 classpath에:

```text
logback-ecs-encoder
```

JAR가 존재하지 않았다.

즉:

```text
logback-spring.xml
        ↓
EcsEncoder 요청
        ↓
Dependency 미적용
        ↓
ClassNotFoundException
        ↓
Logback 초기화 실패
        ↓
Spring Boot 기동 실패
```

### 해결

각 서비스 `pom.xml`에:

```xml
<dependency>
    <groupId>co.elastic.logging</groupId>
    <artifactId>logback-ecs-encoder</artifactId>
    <version>1.8.0</version>
</dependency>
```

추가 후 Maven Reload 수행.

확인:

```powershell
.\mvnw.cmd dependency:tree | Select-String "elastic"
```

정상 예:

```text
co.elastic.logging:logback-ecs-encoder:jar:1.8.0
co.elastic.logging:ecs-logging-core:jar:1.8.0
```

그 후:

```powershell
.\mvnw.cmd clean compile
```

---

## 22. ELK Docker 구성

현재 계획된 Docker Container:

```text
msa-elasticsearch
msa-kibana
msa-logstash
msa-filebeat
```

기본 Port:

```text
Elasticsearch : 9200
Kibana        : 5601
Logstash      : 5044
```

Kafka/MariaDB와 별도 인프라로 구성한다.

---

## 23. ELK 최초 확인 순서

### 1. Spring 서비스 실행

먼저 각 서비스의 JSON 로그가 생성되는지 확인한다.

예:

```text
order-service/logs/order-service.json
```

### 2. ELK 실행

```powershell
docker compose -f docker-compose-elk.yml up -d
```

### 3. Container 확인

```powershell
docker ps
```

### 4. Elasticsearch 확인

```text
http://localhost:9200
```

### 5. Kibana 확인

```text
http://localhost:5601
```

### 6. Index 확인

```text
msa-market-logs-*
```

---

## 24. Kibana Data View

예정 Data View:

```text
Name:
MSA Market Logs

Index Pattern:
msa-market-logs-*

Timestamp:
@timestamp
```

기본 검색 예:

```text
service.name : "order-service"
```

```text
service.name : "catalog-service"
```

```text
log.level : "ERROR"
```

```text
message : *Kafka*
```

---

## 25. 서비스 실행 권장 순서

현재 로컬 환경에서는 다음 순서를 권장한다.

```text
1. MariaDB
2. Kafka / Zookeeper
3. Eureka
4. API Gateway
5. User Service
6. Catalog Service
7. Order Service
8. Next.js
9. Elasticsearch
10. Logstash
11. Filebeat
12. Kibana
```

ELK 로그 수집만 확인할 때는 Spring 서비스와 ELK 순서를 일부 변경해도 된다.

---

## 26. 자주 발생한 오류

### Port 9001 Already In Use

```text
Web server failed to start.
Port 9001 was already in use.
```

확인:

```bat
netstat -ano | findstr :9001
```

종료:

```bat
taskkill /PID {PID} /F
```

PowerShell:

```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 9001 -State Listen).OwningProcess -Force
```

---

### DevTools 재기동 문제

Classpath에:

```text
spring-boot-devtools
```

가 포함되어 있어 `restartedMain`으로 실행된다.

필요 시 비활성화:

```yaml
spring:
  devtools:
    restart:
      enabled: false
```

---

### Config / Rabbit 관련 Warning

기존 강의 구조의 Config Client / Spring Cloud Bus / Rabbit dependency가 일부 남아 있어 Warning이 발생할 수 있다.

현재 기능에서 사용하지 않는다면 향후 정리 대상이다.

---

## 27. 현재 남아 있는 레거시 요소

아직 다음 요소들이 일부 남아 있다.

- H2 Dependency
- Config Client
- Spring Cloud Bus AMQP
- RabbitMQ 관련 Dependency
- Vite 관련 파일
- `.idea`
- 강의 실습용 서비스/자료
- 이전 Zuul 예제
- Actuator Demo
- Config Service 교육용 설정

현재 기능 안정화 후 정리하는 것을 권장한다.

---

## 28. 현재 데이터 정합성 한계

Kafka 주문 처리 구조는 현재:

```text
Order DB 저장
      ↓
Kafka Publish
```

형태다.

다음 상황이 발생할 수 있다.

```text
Order 저장 성공
Kafka Publish 실패
```

결과:

```text
Order = 존재
Catalog 재고 = 미반영
```

취소도 마찬가지다.

현재는 학습/포트폴리오 구조로 유지한다.

---

## 29. 향후 개선 대상

### Transactional Outbox

```text
Order Transaction
    │
    ├─ orders
    └─ outbox_event
          │
          ▼
    Outbox Publisher
          │
          ▼
        Kafka
```

DB Transaction과 이벤트 발행의 정합성을 높인다.

### Idempotency

Kafka 메시지가 재처리되더라도 재고가 중복 차감되지 않도록 한다.

예:

```text
processed_event

event_id UNIQUE
processed_at
```

Consumer:

```text
eventId 처리 이력 존재
    │
    ├─ YES → skip
    └─ NO  → stock update
```

---

## 30. ELK 향후 고도화

현재는 `message` 안에서 `eventId`를 검색하는 수준이다.

향후 다음처럼 ECS Custom Field로 분리한다.

```json
{
  "event.id": "abc123",
  "order.id": "ORDER-001",
  "user.id": "USER-001",
  "product.id": "CATALOG-001",
  "service.name": "order-service"
}
```

그러면 Kibana에서:

```text
event.id : "abc123"
```

만 검색하여 다음 전체 흐름을 추적할 수 있다.

```text
Gateway
   ↓
Order Service
   ↓
Kafka Producer
   ↓
Kafka Broker
   ↓
Catalog Consumer
   ↓
Inventory Update
```

---

## 31. 보안 향후 개선

현재 포트폴리오용 구현에서는 Gateway JWT 검증에 중심을 두고 있다.

향후:

- 내부 서비스 직접 접근 제한
- User Service `/users/**` 보호 강화
- Order URL의 userId 직접 신뢰 제거
- JWT Claim 기반 사용자 식별
- ADMIN / USER Role 구분
- DB/JWT Secret 환경변수화

적용을 권장한다.

---

## 32. Git 관리

현재 Repository:

```text
https://github.com/jooyoungyun/msa-market-platform
```

강사 원본은 `upstream`, 개인 Repository는 `origin`으로 운영하는 방식을 권장한다.

```bash
git remote -v
```

작업:

```bash
git add .
git commit -m "feat: add ELK logging configuration"
git push
```

---

## 33. 현재 프로젝트의 핵심 시연 시나리오

### 사용자

```text
회원가입
  ↓
로그인
  ↓
JWT 발급
  ↓
상품 조회
  ↓
장바구니
  ↓
주문
```

### Backend

```text
Gateway
  ↓
Order Service
  ↓
Order DB 저장
  ↓
Kafka ORDER_CREATED
  ↓
Catalog Consumer
  ↓
재고 차감
```

### 관리자

```text
Admin
  ↓
주문 조회
  ↓
주문 취소
  ↓
Kafka ORDER_CANCELLED
  ↓
Catalog Consumer
  ↓
재고 복원
```

### 모니터링

```text
Kafka Flow Monitor
  ↓
eventId
topic
partition
offset
stock before/after
```

### ELK

```text
Service JSON Log
  ↓
Filebeat
  ↓
Logstash
  ↓
Elasticsearch
  ↓
Kibana
```

---

## 34. 현재 단계 결론

현재 프로젝트는 단순 Spring Cloud 강의 소스에서 다음 단계까지 확장되었다.

```text
Spring Cloud Training Sample
            ↓
MariaDB
            ↓
JWT / Gateway
            ↓
Kafka Event Driven Order
            ↓
Admin Console
            ↓
Kafka Flow Monitor
            ↓
Next.js
            ↓
System Monitor
            ↓
ELK Observability - 1차 적용 진행
```

현재 ELK 단계에서는 우선 다음 목표까지만 완료한다.

```text
1. JDK 11 고정
2. ECS Encoder Dependency 적용
3. Spring Boot 정상 기동
4. logs/*.json 생성
5. Filebeat 수집
6. Logstash 전달
7. Elasticsearch 저장
8. Kibana 조회
```

그 이후 Structured Event Field, Trace ID, Outbox, Idempotency 등은 별도 고도화 단계로 진행한다.

---

## 35. 다음 작업 후보

- ELK 정상 기동 및 Kibana Discover 확인
- `event.id`, `order.id`, `product.id` 구조화 로그
- Gateway 요청 Trace ID
- Kafka Consumer Idempotency
- Transactional Outbox
- Docker Compose 통합
- README 전면 개편
- 보안 설정 정리
- CI/CD
