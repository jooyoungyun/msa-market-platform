# MSA Market Platform - 전체 Docker 실행 가이드

> 기준 환경: Windows 11 + Docker Desktop + IntelliJ IDEA 2026.2 + JDK 11  
> 프로젝트 루트 예시: `D:\SpringCloud`  
> 목적: MariaDB, Kafka, Eureka, Spring Boot 서비스, Next.js, ELK 전체를 Docker Compose 하나로 실행하고, 필요 시 Spring 서비스는 IntelliJ에서 개별 실행할 수 있도록 구성한다.

---

# 1. 전체 구성

전체 Docker 모드에서는 다음 서비스를 하나의 Docker Network에서 실행한다.

```text
Windows 11 / Docker Desktop
        │
        └─ msa-market-net
            ├─ MariaDB
            ├─ ZooKeeper
            ├─ Kafka
            ├─ Discovery Service (Eureka)
            ├─ User Service
            ├─ Catalog Service
            ├─ Order Service
            ├─ API Gateway
            ├─ Next.js Frontend
            ├─ Elasticsearch
            ├─ Logstash
            ├─ Filebeat
            └─ Kibana
```

기본 접속 포트:

```text
Frontend        http://localhost:3300
API Gateway     http://localhost:8000
Eureka          http://localhost:8761
User Service    http://localhost:9001
Catalog Service http://localhost:9002
Order Service   http://localhost:9003

MariaDB         localhost:3306
Kafka           localhost:9092

Elasticsearch   http://localhost:9200
Kibana          http://localhost:5601
Logstash        localhost:5044
```

Next.js Container 내부 포트는 `3000`이지만 Windows Host에서는 `3300`으로 연결한다.

```text
Host :3300 → Container :3000
```

---

# 2. 실행 모드

이 프로젝트는 두 가지 방식으로 실행 가능하도록 구성한다.

## 2.1 전체 Docker 모드

통합 테스트 / 시연 / 포트폴리오 용도.

```powershell
cd D:\SpringCloud

docker compose -f docker-compose.full.yml up -d --build
```

전체 시스템을 Docker Compose 하나로 실행한다.

---

## 2.2 개발 모드

개발 중에는 인프라만 Docker로 실행하고 Spring 서비스는 IntelliJ에서 개별 실행할 수 있다.

```text
Docker
├─ MariaDB
├─ ZooKeeper
├─ Kafka
├─ Elasticsearch
├─ Logstash
├─ Filebeat
└─ Kibana

IntelliJ
├─ discoveryservice
├─ user-service
├─ catalog-service
├─ order-service
└─ apigateway-service

PowerShell
└─ Next.js
```

이 방식은 Spring 코드를 수정할 때 Docker Image를 매번 다시 빌드하지 않아도 되므로 개발에 유리하다.

---

# 3. Host 실행과 Docker 실행 주소 차이

Spring 서비스가 어디에서 실행되는지에 따라 주소가 달라진다.

## IntelliJ에서 실행할 때

```text
MariaDB → localhost:3306
Kafka   → localhost:9092
Eureka  → localhost:8761
```

## Docker Container에서 실행할 때

```text
MariaDB → mariadb:3306
Kafka   → kafka:29092
Eureka  → discoveryservice:8761
```

따라서 Spring 설정은 환경변수를 우선 사용하고, 기본값은 Host 개발용 주소를 사용하도록 한다.

예:

```yaml
spring:
  datasource:
    url: ${DB_URL:jdbc:mariadb://localhost:3306/msa_ecommerce}
    username: ${DB_USERNAME:msa}
    password: ${DB_PASSWORD:msa1234}

  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}

eureka:
  client:
    service-url:
      defaultZone: ${EUREKA_DEFAULT_ZONE:http://127.0.0.1:8761/eureka/}
```

Docker Compose에서는 환경변수로 Docker Network 주소를 주입한다.

```yaml
environment:
  DB_URL: jdbc:mariadb://mariadb:3306/msa_ecommerce
  DB_USERNAME: msa
  DB_PASSWORD: msa1234
  KAFKA_BOOTSTRAP_SERVERS: kafka:29092
  EUREKA_DEFAULT_ZONE: http://discoveryservice:8761/eureka/
```

---

# 4. Kafka Listener 구성

Host와 Docker Container에서 동시에 접근할 수 있도록 Kafka Listener를 분리한다.

```text
Windows Host Spring
→ localhost:9092

Docker Spring
→ kafka:29092
```

Docker 내부 Spring 서비스에서는 반드시:

```text
kafka:29092
```

를 사용한다.

Host IntelliJ 실행 시에는:

```text
localhost:9092
```

를 사용한다.

---

# 5. 실행 전 준비

Docker Desktop이 정상인지 확인한다.

```powershell
docker version
docker run --rm hello-world
```

정상이어야 한다.

Docker Desktop이 비정상이라면 Compose 문제를 보기 전에 Docker Engine부터 정상화해야 한다.

---

# 6. 기존 개별 Compose 정리

기존에 MariaDB / Kafka / ELK를 각각 실행하고 있었다면 전체 Docker Compose 실행 전에 내려준다.

## MariaDB

```powershell
docker compose -f docker-compose-mariadb.yml down
```

## Kafka / ZooKeeper

```powershell
docker compose -f docker-compose-kafka.yml down
```

## ELK

```powershell
docker compose -f infrastructure/elk/docker-compose-elk.yml down
```

주의:

```powershell
docker compose down -v
```

는 사용하지 않는다.

`-v`를 사용하면 MariaDB / Elasticsearch 등의 Named Volume 데이터가 삭제될 수 있다.

---

# 7. 기존 Container 충돌 확인

확인:

```powershell
docker ps -a --format "table {{.Names}}\t{{.Status}}"
```

예를 들어 기존 Container가 남아 있으면:

```text
msa-mariadb
msa-zookeeper
msa-kafka
msa-elasticsearch
msa-logstash
msa-filebeat
msa-kibana
```

전체 Compose와 Container Name 충돌이 발생할 수 있다.

필요 시 Container만 제거한다.

```powershell
docker rm -f msa-elasticsearch
docker rm -f msa-logstash
docker rm -f msa-filebeat
docker rm -f msa-kibana
```

Kafka / MariaDB도 기존 Compose에서 정상적으로 `down` 되지 않았다면:

```powershell
docker rm -f msa-kafka msa-zookeeper msa-mariadb
```

Container 제거와 Volume 제거는 다르다.

`docker volume rm` 또는 `down -v`를 하지 않는 한 Named Volume은 유지된다.

---

# 8. 전체 Docker 빌드 및 실행

프로젝트 Root:

```powershell
cd D:\SpringCloud
```

전체 빌드 및 실행:

```powershell
docker compose -f docker-compose.full.yml up -d --build
```

이미 Build가 완료된 경우:

```powershell
docker compose -f docker-compose.full.yml up -d
```

---

# 9. Frontend Docker Build 주의사항

현재 Frontend는 Next.js App Router로 전환했지만 과거 Vite 파일 일부가 남아 있을 수 있다.

대표 레거시 파일:

```text
vite.config.ts
src/main.tsx
tsconfig.app.json
tsconfig.node.json
```

Docker Next.js Build에서 다음 오류가 발생할 수 있다.

```text
vite.config.ts(2,19): error TS2307:
Cannot find module '@vitejs/plugin-react'
```

이 경우 Vite 레거시 파일을 Next.js TypeScript 검사 대상에서 제외한다.

`tsconfig.json` 예:

```json
{
  "exclude": [
    "node_modules",
    "vite.config.ts",
    "src/main.tsx"
  ]
}
```

`.dockerignore`에도 필요 없는 Vite 관련 파일을 제외할 수 있다.

Frontend만 검증할 때:

```powershell
docker compose -f docker-compose.full.yml build --no-cache frontend
```

---

# 10. Healthcheck 설정

## 10.1 Discovery Service

Eureka가 정상 기동되면 Healthy 상태가 되어야 한다.

---

## 10.2 Catalog Service

Catalog 실제 Health Check URL:

```text
http://127.0.0.1:9002/catalog-service/health_check
```

Compose 예:

```yaml
healthcheck:
  test:
    [
      "CMD-SHELL",
      "curl -fsS http://127.0.0.1:9002/catalog-service/health_check >/dev/null || exit 1"
    ]
  interval: 10s
  timeout: 5s
  retries: 30
  start_period: 20s
```

잘못된 예:

```text
http://127.0.0.1:9002/health_check
```

Catalog Application은 정상 실행 중이어도 잘못된 URL을 사용하면 Docker는 계속 `unhealthy`로 판단한다.

---

## 10.3 Order Service

Order 실제 Health Check URL:

```text
http://127.0.0.1:9003/order-service/health_check
```

Compose 예:

```yaml
healthcheck:
  test:
    [
      "CMD-SHELL",
      "curl -fsS http://127.0.0.1:9003/order-service/health_check >/dev/null || exit 1"
    ]
  interval: 10s
  timeout: 5s
  retries: 30
  start_period: 20s
```

---

## 10.4 API Gateway

Gateway Health Check:

```text
http://127.0.0.1:8000/actuator/health
```

Compose 예:

```yaml
healthcheck:
  test:
    [
      "CMD-SHELL",
      "curl -fsS http://127.0.0.1:8000/actuator/health >/dev/null || exit 1"
    ]
  interval: 10s
  timeout: 5s
  retries: 30
  start_period: 20s
```

---

# 11. Gateway application.yml 주의사항

Gateway에서 YAML Key 중복이 있으면 Application 자체가 시작되지 않는다.

대표 오류:

```text
DuplicateKeyException
found duplicate key instance
```

잘못된 예:

```yaml
eureka:
  instance:
    hostname: 127.0.0.1

  client:
    service-url:
      defaultZone: http://127.0.0.1:8761/eureka/

  instance:
    prefer-ip-address: true
```

`instance:`가 두 번 선언되어 있다.

정상 예:

```yaml
eureka:
  instance:
    hostname: ${EUREKA_INSTANCE_HOSTNAME:127.0.0.1}
    prefer-ip-address: false
    instance-id: ${spring.application.name}:${server.port}

  client:
    register-with-eureka: true
    fetch-registry: true
    service-url:
      defaultZone: ${EUREKA_DEFAULT_ZONE:http://127.0.0.1:8761/eureka/}
```

---

# 12. Gateway Rabbit Health Check 비활성화

기존 강의 프로젝트에 RabbitMQ / Spring Cloud Bus 관련 Dependency가 일부 남아 있을 수 있다.

RabbitMQ를 현재 사용하지 않는데 Actuator Health에 포함되면 Gateway Application은 정상인데도 `/actuator/health`가 `DOWN`이 될 수 있다.

따라서 Gateway 설정:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus

  health:
    rabbit:
      enabled: false
```

를 적용한다.

향후 RabbitMQ / Spring Cloud Bus를 완전히 제거할 경우 관련 Dependency도 정리한다.

---

# 13. 전체 상태 확인

```powershell
docker compose -f docker-compose.full.yml ps
```

정상 목표:

```text
msa-mariadb              Healthy
msa-zookeeper            Up
msa-kafka                Healthy
msa-discoveryservice     Healthy
msa-user-service         Up / Healthy
msa-catalog-service      Healthy
msa-order-service        Healthy
msa-apigateway-service   Healthy
msa-frontend             Up
msa-elasticsearch        Healthy
msa-logstash             Up
msa-filebeat             Up
msa-kibana               Up
```

특히 아래 4개가 중요하다.

```text
msa-catalog-service
msa-order-service
msa-apigateway-service
msa-frontend
```

---

# 14. Container 로그 확인

## Discovery

```powershell
docker logs msa-discoveryservice --tail 200
```

## User

```powershell
docker logs msa-user-service --tail 200
```

## Catalog

```powershell
docker logs msa-catalog-service --tail 200
```

실시간:

```powershell
docker logs -f msa-catalog-service
```

## Order

```powershell
docker logs msa-order-service --tail 200
```

## Gateway

```powershell
docker logs msa-apigateway-service --tail 200
```

## Frontend

```powershell
docker logs msa-frontend --tail 200
```

---

# 15. Eureka 확인

브라우저:

```text
http://localhost:8761
```

최소 다음 서비스가 `UP`이어야 한다.

```text
USER-SERVICE
CATALOG-SERVICE
ORDER-SERVICE
APIGATEWAY-SERVICE
```

Docker 환경에서는 Eureka에 Windows PC Hostname이 등록되어서는 안 된다.

예:

```text
DESKTOP-XXXXXXX
```

대신 Docker Service Name 기반으로 등록되어야 한다.

예:

```text
user-service
catalog-service
order-service
apigateway-service
```

---

# 16. Frontend 확인

브라우저:

```text
http://localhost:3300
```

정상 확인:

```text
메인 화면
로그인
상품 목록
장바구니
주문
관리자
System Monitor
```

---

# 17. 실제 기능 테스트

전체 Docker 구성이 정상화되면 다음 순서로 테스트한다.

```text
1. Frontend 접속
2. 사용자 로그인
3. Catalog 상품 목록 확인
4. 주문 생성
5. Order DB 저장 확인
6. Kafka ORDER_CREATED 발행
7. Catalog Consumer 수신
8. 재고 감소 확인
9. System Monitor → Kafka Live Flow 확인
10. 관리자 로그인
11. 주문 취소
12. Kafka ORDER_CANCELLED 발행
13. Catalog Consumer 수신
14. 재고 복원 확인
```

Kafka Flow 정상 순서:

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

주문 취소:

```text
ORDER_DELETED
    ↓
PRODUCER_SEND
    ↓
BROKER_ACK
    ↓
CONSUMED
    ↓
INVENTORY_RESTORED
```

최근 Kafka Event 선택 기능도 확인한다.

```text
CATALOG-001
CATALOG-002
CATALOG-003
CATALOG-004
```

이벤트 클릭 시:

```text
선택 표시 이동
→ Topic 변경
→ Partition / Offset 변경
→ Timeline 변경
→ Payload 변경
```

이 정상 동작해야 한다.

---

# 18. Kafka 확인

Container:

```powershell
docker ps | findstr msa-kafka
```

Topic 목록:

```powershell
docker exec -it msa-kafka kafka-topics `
  --bootstrap-server localhost:9092 `
  --list
```

정상 Topic:

```text
example-catalog-topic
```

Topic 상세:

```powershell
docker exec -it msa-kafka kafka-topics `
  --bootstrap-server localhost:9092 `
  --describe `
  --topic example-catalog-topic
```

Kafka 로그:

```powershell
docker logs msa-kafka --tail 200
```

---

# 19. Kafka LEADER_NOT_AVAILABLE

Catalog 시작 직후 다음 Warning이 잠깐 나올 수 있다.

```text
LEADER_NOT_AVAILABLE
```

이후 다음 로그가 정상적으로 나오면 문제없다.

```text
Successfully joined group
Adding newly assigned partitions
partitions assigned: [example-catalog-topic-0]
```

이는 Topic 생성 및 Leader Election 초기 시점에 일시적으로 발생할 수 있다.

---

# 20. MariaDB 확인

Container:

```powershell
docker ps | findstr msa-mariadb
```

접속:

```powershell
docker exec -it msa-mariadb mariadb -u msa -pmsa1234 msa_ecommerce
```

테이블:

```sql
SHOW TABLES;
```

주요 테이블 예:

```text
users
catalog
orders
kafka_event_log
```

주의:

전체 Docker 전환 후 기존 데이터가 보이지 않는다면 기존 Compose와 Full Compose가 서로 다른 Named Volume을 사용하고 있는지 확인한다.

---

# 21. Elasticsearch 확인

브라우저:

```text
http://localhost:9200
```

PowerShell:

```powershell
Invoke-RestMethod http://localhost:9200
```

Index 확인:

```powershell
Invoke-RestMethod 'http://localhost:9200/_cat/indices/msa-market-logs-*?v'
```

---

# 22. Kibana 확인

브라우저:

```text
http://localhost:5601
```

Data View:

```text
Name:
MSA Market Logs

Index Pattern:
msa-market-logs-*

Timestamp:
@timestamp
```

검색 예:

```text
service.name : "order-service"
```

```text
service.name : "catalog-service"
```

```text
service.name : "user-service"
```

```text
service.name : "apigateway-service"
```

Kafka:

```text
message : *Kafka*
```

---

# 23. Filebeat / Logstash 확인

Filebeat:

```powershell
docker logs msa-filebeat --tail 200
```

Logstash:

```powershell
docker logs msa-logstash --tail 200
```

Elasticsearch:

```powershell
docker logs msa-elasticsearch --tail 200
```

Kibana:

```powershell
docker logs msa-kibana --tail 200
```

---

# 24. 서비스 하나만 다시 Build

코드 수정 후 전체를 다시 빌드할 필요는 없다.

## Gateway

```powershell
docker compose -f docker-compose.full.yml build --no-cache apigateway-service
docker compose -f docker-compose.full.yml up -d apigateway-service
```

## Catalog

```powershell
docker compose -f docker-compose.full.yml build --no-cache catalog-service
docker compose -f docker-compose.full.yml up -d catalog-service
```

## Order

```powershell
docker compose -f docker-compose.full.yml build --no-cache order-service
docker compose -f docker-compose.full.yml up -d order-service
```

## User

```powershell
docker compose -f docker-compose.full.yml build --no-cache user-service
docker compose -f docker-compose.full.yml up -d user-service
```

## Frontend

```powershell
docker compose -f docker-compose.full.yml build --no-cache frontend
docker compose -f docker-compose.full.yml up -d frontend
```

---

# 25. 전체 종료

```powershell
docker compose -f docker-compose.full.yml down
```

데이터를 유지하려면 이것만 사용한다.

다시 강조:

```powershell
docker compose -f docker-compose.full.yml down -v
```

는 데이터 Volume까지 삭제할 수 있으므로 일반적인 종료 시 사용하지 않는다.

---

# 26. 전체 재시작

```powershell
docker compose -f docker-compose.full.yml down
docker compose -f docker-compose.full.yml up -d
```

코드까지 다시 Build:

```powershell
docker compose -f docker-compose.full.yml down
docker compose -f docker-compose.full.yml up -d --build
```

---

# 27. 문제 발생 시 기본 진단 순서

전체 Compose 실패 시 무조건 다음 순서로 본다.

```text
1. docker compose ps
2. unhealthy Container 확인
3. 해당 Container 로그 확인
4. Application 자체 오류인지 Healthcheck 오류인지 분리
5. depends_on으로 대기 중인 서비스는 후순위
```

명령:

```powershell
docker compose -f docker-compose.full.yml ps
```

예:

```text
Catalog unhealthy
→ Order Created
→ Gateway Created
→ Frontend Created
```

이 경우 Order/Gateway/Frontend를 먼저 보면 안 된다.

Catalog 로그부터 본다.

```powershell
docker logs msa-catalog-service --tail 200
```

---

# 28. Application 정상 / Healthcheck 실패 구분

예를 들어 Catalog 로그에:

```text
Tomcat started on port(s): 9002
Registering application CATALOG-SERVICE with eureka with status UP
Started CatalogServiceApplication
```

이 보이면 Application 자체는 정상이다.

그런데 Docker 상태가:

```text
unhealthy
```

이면 Healthcheck URL을 먼저 확인한다.

반대로:

```text
Application run failed
DuplicateKeyException
Connection refused
BeanCreationException
```

등이 보이면 Application 자체 오류다.

---

# 29. 현재 확인된 주요 오류 정리

## Frontend

```text
Cannot find module '@vitejs/plugin-react'
```

원인:

```text
Next.js 이전 Vite 설정 파일이 TypeScript 검사 대상에 포함됨
```

조치:

```text
tsconfig / dockerignore에서 Vite 레거시 제외
```

---

## Catalog unhealthy

Application은 정상인데 Healthcheck URL 오류.

정상 URL:

```text
/catalog-service/health_check
```

---

## Order unhealthy

정상 URL:

```text
/order-service/health_check
```

---

## Gateway 반복 Restart

오류:

```text
DuplicateKeyException
found duplicate key instance
```

원인:

```text
application.yml 안의 eureka.instance 중복 선언
```

조치:

```text
하나의 eureka.instance로 통합
```

---

## Gateway Actuator DOWN

가능 원인:

```text
RabbitMQ Health Indicator
```

RabbitMQ를 사용하지 않는 현재 구성에서는:

```yaml
management:
  health:
    rabbit:
      enabled: false
```

적용.

---

# 30. 최종 완료 기준

다음 조건을 모두 만족하면 전체 Docker 전환 완료로 본다.

```text
[ ] docker compose ps에서 필수 Container 모두 Up / Healthy
[ ] Eureka에 User/Catalog/Order/Gateway 등록
[ ] Frontend localhost:3300 접속
[ ] 로그인 성공
[ ] Catalog 목록 조회
[ ] 주문 생성 성공
[ ] Kafka 이벤트 발행/소비
[ ] 재고 감소
[ ] Kafka Live Flow 표시
[ ] 과거 Event 클릭 조회
[ ] 관리자 주문 취소
[ ] Kafka 취소 이벤트 처리
[ ] 재고 복원
[ ] Elasticsearch 정상
[ ] Kibana 접속
[ ] Spring JSON 로그 수집
```

---

# 31. 권장 운영 방식

개발:

```text
MariaDB/Kafka/ELK → Docker
Spring → IntelliJ
Next.js → npm run dev
```

통합 테스트 / 시연:

```text
docker compose -f docker-compose.full.yml up -d --build
```

이렇게 두 가지 실행 방식을 모두 유지하는 것을 권장한다.

---

# 32. 자주 사용하는 명령 요약

전체 실행:

```powershell
docker compose -f docker-compose.full.yml up -d
```

Build 포함:

```powershell
docker compose -f docker-compose.full.yml up -d --build
```

상태:

```powershell
docker compose -f docker-compose.full.yml ps
```

전체 로그:

```powershell
docker compose -f docker-compose.full.yml logs --tail 100
```

특정 로그:

```powershell
docker logs msa-apigateway-service --tail 200
```

실시간:

```powershell
docker logs -f msa-catalog-service
```

종료:

```powershell
docker compose -f docker-compose.full.yml down
```

---

# 33. 현재 테스트 진행 순서

현재 Full Docker 설정 적용 후 다음 순서로 검증한다.

```text
1. MariaDB
2. ZooKeeper
3. Kafka
4. Eureka
5. User Service
6. Catalog Service
7. Order Service
8. API Gateway
9. Next.js
10. Elasticsearch
11. Logstash
12. Filebeat
13. Kibana
14. 실제 주문 / Kafka / 재고 / 관리자 기능 테스트
```

한 단계가 `unhealthy`라면 그 다음 서비스보다 해당 서비스부터 해결한다.

