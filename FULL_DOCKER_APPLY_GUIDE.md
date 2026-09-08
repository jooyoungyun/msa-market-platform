# MSA Market Platform - 전체 Docker 실행 전환 가이드

## 1. 목표

현재 구조의 Spring Boot/Next.js까지 Docker Container로 전환한다.

```text
Windows 11 / Docker Desktop (WSL2)
└─ msa-market-net
   ├─ MariaDB              :3306
   ├─ ZooKeeper            :2181
   ├─ Kafka                :9092(host) / :29092(container)
   ├─ Eureka               :8761
   ├─ User Service         :9001
   ├─ Catalog Service      :9002
   ├─ Order Service        :9003
   ├─ API Gateway          :8000
   ├─ Next.js              :3000(container) -> :3300(host)
   ├─ Elasticsearch        :9200
   ├─ Logstash             :5044 / :9600
   ├─ Filebeat
   └─ Kibana               :5601
```

## 2. 적용 방법

예상 구조:

```text
D:\SpringCloud
├─ discoveryservice
├─ apigateway-service
├─ user-service
├─ catalog-service
├─ order-service
├─ msa-react-test-ui
├─ infrastructure\elk
├─ scripts
└─ docker-compose.full.yml
```

각 서비스의 기존 `src`, `pom.xml`, frontend source는 유지된다. 이 패키지는 Dockerfile과 Docker용 설정 파일을 추가/교체하는 Overlay다.

## 3. 핵심 변경점

로컬 IntelliJ 실행 시 주소와 Docker 내부 주소가 다르므로 application.yml을 환경변수 기반으로 변경한다.

### MariaDB

로컬 기본값:

```text
jdbc:mariadb://localhost:3306/msa_ecommerce
```

Docker:

```text
jdbc:mariadb://mariadb:3306/msa_ecommerce
```

Compose가 `DB_URL`을 주입한다.

### Eureka

로컬:

```text
http://127.0.0.1:8761/eureka
```

Docker:

```text
http://discoveryservice:8761/eureka
```

각 서비스는 Docker DNS 이름으로 등록한다.

```text
user-service
catalog-service
order-service
apigateway-service
```

따라서 기존에 발생했던 `DESKTOP-xxxx UnknownHostException` 문제를 피한다.

### Kafka

Kafka는 Listener를 둘로 분리한다.

```text
Host IntelliJ -> localhost:9092
Docker Spring -> kafka:29092
```

Docker 서비스가 `localhost:9092`를 사용하면 자기 컨테이너 자신을 의미하므로 사용할 수 없다.

### Next.js

브라우저는 계속 다음 API를 사용한다.

```text
/api/*
```

Next.js 서버 내부 Rewrite:

```text
/api/* -> http://apigateway-service:8000/*
```

Windows 3000 포트가 예약 범위에 포함되어 있었으므로 Host는 `3300`을 사용한다.

```text
Host http://localhost:3300
Container frontend:3000
```

## 4. 실행

Docker Desktop이 정상이어야 한다.

```powershell
docker version
docker run --rm hello-world
```

프로젝트 Root:

```powershell
cd D:\SpringCloud
docker compose -f docker-compose.full.yml up -d --build
```

또는:

```powershell
.\scripts\docker-up.ps1
```

최초 Maven/Node/Elastic image 다운로드 때문에 시간이 걸릴 수 있다.

## 5. 확인

```powershell
docker compose -f docker-compose.full.yml ps
```

모든 서비스가 `Up` 또는 `healthy`여야 한다.

접속:

```text
Frontend      http://localhost:3300
Gateway       http://localhost:8000
Eureka        http://localhost:8761
Elasticsearch http://localhost:9200
Kibana        http://localhost:5601
```

Eureka에는 최소 다음 4개가 UP이어야 한다.

```text
USER-SERVICE
CATALOG-SERVICE
ORDER-SERVICE
APIGATEWAY-SERVICE
```

## 6. Kafka 확인

```powershell
docker exec -it msa-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

주문 이벤트 발생 후:

```text
example-catalog-topic
```

확인.

메시지 확인:

```powershell
docker exec -it msa-kafka kafka-console-consumer `
  --bootstrap-server localhost:9092 `
  --topic example-catalog-topic `
  --from-beginning
```

## 7. 로그 확인

전체:

```powershell
.\scripts\docker-logs.ps1
```

한 서비스:

```powershell
.\scripts\docker-logs.ps1 catalog-service
```

Docker Console 로그와 별도로 Spring ECS JSON 로그는 다음 Host 폴더에 남는다.

```text
runtime-logs\apigateway-service
runtime-logs\user-service
runtime-logs\catalog-service
runtime-logs\order-service
```

Filebeat가 이를 읽어 Logstash -> Elasticsearch로 전달한다.

## 8. Kibana

Index:

```text
msa-market-logs-*
```

Data View Timestamp:

```text
@timestamp
```

추천 검색:

```text
service.name : "order-service"
service.name : "catalog-service"
log.level : "ERROR"
message : *Kafka*
```

## 9. Admin 계정

현재 초기화 로직 기준:

```text
admin@test.com / admin1234
ROLE_ADMIN
```

DB Volume이 이미 존재하고 계정 초기화가 과거에 끝난 상태라면 실제 DB 데이터를 우선한다.

## 10. 종료

컨테이너만 종료하고 DB/Elasticsearch 데이터 유지:

```powershell
docker compose -f docker-compose.full.yml down
```

또는:

```powershell
.\scripts\docker-down.ps1
```

**데이터를 유지하려면 `-v`를 붙이지 않는다.**

다음 명령은 MariaDB/Elasticsearch/Filebeat Volume까지 삭제하므로 초기화가 필요할 때만 사용한다.

```powershell
docker compose -f docker-compose.full.yml down -v
```

## 11. 소스 변경 후 재빌드

전체:

```powershell
docker compose -f docker-compose.full.yml up -d --build
```

애플리케이션만 강제 재빌드:

```powershell
.\scripts\docker-rebuild-apps.ps1
```

특정 서비스만:

```powershell
docker compose -f docker-compose.full.yml up -d --build catalog-service
```

Frontend만:

```powershell
docker compose -f docker-compose.full.yml up -d --build frontend
```

## 12. Windows/WSL2에서 Elasticsearch가 뜨지 않을 때

먼저 로그:

```powershell
docker logs msa-elasticsearch --tail 200
```

`vm.max_map_count` 관련 오류일 때만 관리자 PowerShell에서:

```powershell
wsl -d docker-desktop -u root sysctl -w vm.max_map_count=1048576
```

Docker Desktop은 ELK까지 동시에 실행하므로 최소 8GB 정도의 메모리 여유를 두는 것을 권장한다.

## 13. 주의: Docker 내부 localhost

Docker 전환에서 가장 중요한 원칙이다.

```text
mariadb:3306
kafka:29092
discoveryservice:8761
user-service:9001
catalog-service:9002
order-service:9003
apigateway-service:8000
```

컨테이너 간 통신에는 서비스 이름을 사용한다.

`localhost`는 해당 컨테이너 자기 자신이므로 다른 컨테이너 접속 주소로 사용하지 않는다.

## 14. 권장 검증 시나리오

1. `docker compose ... ps` 전체 healthy 확인
2. Eureka 4개 서비스 UP 확인
3. Frontend `http://localhost:3300` 접속
4. `admin@test.com / admin1234` 로그인
5. 상품 조회
6. 주문 생성
7. Kafka Live Flow에서 `ORDER_CREATED` 확인
8. 최근 Kafka Event 카드 클릭하여 과거 이벤트 전환 확인
9. 관리자 주문 취소
10. `ORDER_CANCELLED / INVENTORY_RESTORED` 확인
11. Kibana에서 Order/Catalog Kafka 로그 검색

이 시나리오까지 통과하면 현재 MSA Market Platform의 전체 Docker 전환이 완료된 것이다.
