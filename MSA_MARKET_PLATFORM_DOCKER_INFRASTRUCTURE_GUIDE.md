# MSA Market Platform - Docker Infrastructure 실행 가이드

> 대상 프로젝트: `msa-market-platform`  
> 기준 환경: Windows 11 + Docker Desktop + IntelliJ IDEA + JDK 11  
> 목적: 프로젝트 실행에 필요한 MariaDB, Kafka, ZooKeeper, Elasticsearch, Logstash, Filebeat, Kibana를 Docker로 구성하고 정상 동작 여부를 확인한다.

---

# 1. 가이드 목적

MSA Market Platform의 Spring Boot 서비스와 Next.js Frontend는 로컬에서 직접 실행하고, 다음 공통 인프라는 Docker Container로 실행한다.

```text
Docker
├─ MariaDB
├─ ZooKeeper
├─ Kafka
├─ Elasticsearch
├─ Logstash
├─ Filebeat
└─ Kibana
```

Spring Boot 서비스:

```text
IntelliJ / JDK 11
├─ discoveryservice
├─ apigateway-service
├─ user-service
├─ catalog-service
└─ order-service
```

Frontend:

```text
Next.js :3000
```

전체 구조:

```text
                         ┌─────────────────────┐
                         │      Next.js        │
                         │       :3000         │
                         └─────────┬───────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │ API Gateway :8000   │
                         └─────────┬───────────┘
                                   │
              ┌────────────────────┼─────────────────────┐
              │                    │                     │
              ▼                    ▼                     ▼
       User Service         Catalog Service       Order Service
          :9001                 :9002                 :9003
              │                    │                     │
              └────────────┬───────┴───────────┬─────────┘
                           │                   │
                           ▼                   ▼
                    MariaDB :3306        Kafka :9092
                                                │
                                          ZooKeeper :2181

Spring Boot JSON Logs
        │
        ▼
     Filebeat
        │
        ▼
     Logstash :5044
        │
        ▼
 Elasticsearch :9200
        │
        ▼
    Kibana :5601
```

---

# 2. 현재 Docker 이미지 구성

현재 프로젝트에서 사용하는 기본 버전은 다음과 같다.

| 구분 | Docker Image | Port |
|---|---|---:|
| MariaDB | `mariadb:10.11` | 3306 |
| ZooKeeper | `confluentinc/cp-zookeeper:7.5.3` | 2181 |
| Kafka | `confluentinc/cp-kafka:7.5.3` | 9092 |
| Elasticsearch | `docker.elastic.co/elasticsearch/elasticsearch:9.5.3` | 9200 |
| Kibana | `docker.elastic.co/kibana/kibana:9.5.3` | 5601 |
| Logstash | `docker.elastic.co/logstash/logstash:9.5.3` | 5044 / 9600 |
| Filebeat | `docker.elastic.co/beats/filebeat:9.5.3` | 내부 실행 |

> 현재 Kafka는 기존 강의 소스와 호환성을 유지하기 위해 ZooKeeper 방식으로 사용한다.  
> Confluent Platform 7.5 계열에서는 신규 구축 시 KRaft가 권장되지만, 본 프로젝트에서는 기존 구조의 안정적인 학습/시연을 우선한다.

---

# 3. 사전 준비

## 3.1 Docker Desktop 설치

Windows에서는 Docker Desktop을 설치하고 실행한다.

Docker Desktop이 실행된 상태에서 PowerShell:

```powershell
docker --version
```

예:

```text
Docker version 27.x.x
```

Compose 확인:

```powershell
docker compose version
```

예:

```text
Docker Compose version v2.x.x
```

현재 가이드에서는 구형:

```text
docker-compose
```

명령보다 Compose V2:

```text
docker compose
```

사용을 기준으로 한다.

---

# 4. Docker Desktop 권장 자원

본 프로젝트는 Kafka와 Elasticsearch를 함께 실행하기 때문에 메모리를 어느 정도 확보해야 한다.

권장:

```text
Docker Desktop Memory : 최소 6GB 이상 권장
여유가 있다면         : 8GB 이상
```

현재 Elasticsearch:

```text
-Xms1g
-Xmx1g
```

Logstash:

```text
-Xms512m
-Xmx512m
```

을 사용한다.

Kafka, ZooKeeper, MariaDB까지 함께 실행되므로 Docker에 메모리를 너무 적게 할당하면 다음 현상이 발생할 수 있다.

```text
Elasticsearch 반복 재시작
Kafka 종료
Kibana 접속 불가
Docker 전체 응답 지연
```

---

# 5. 프로젝트 폴더 기준

로컬 프로젝트 예:

```text
D:\SpringCloud\msa_with_spring_cloud
```

또는 저장소를 새로 Clone한 경우:

```text
D:\SpringCloud\msa-market-platform
```

이 가이드에서는 이를:

```text
<PROJECT_ROOT>
```

라고 표현한다.

예:

```powershell
cd D:\SpringCloud\msa_with_spring_cloud
```

---

# 6. 권장 인프라 폴더 구조

현재 구성 파일을 다음처럼 관리하는 것을 권장한다.

```text
<PROJECT_ROOT>
│
├─ docker-compose-mariadb.yml
├─ docker-compose-kafka.yml
│
├─ infrastructure
│  └─ elk
│     ├─ docker-compose-elk.yml
│     │
│     ├─ filebeat
│     │  └─ filebeat.yml
│     │
│     └─ logstash
│        └─ pipeline
│           └─ logstash.conf
│
├─ apigateway-service
├─ discoveryservice
├─ user-service
├─ catalog-service
├─ order-service
└─ msa-react-test-ui
```

---

# 7. 사용 Port 확인

Docker 기동 전 다음 Port가 이미 사용 중인지 확인하는 것이 좋다.

| Port | 용도 |
|---:|---|
| 2181 | ZooKeeper |
| 3306 | MariaDB |
| 5044 | Logstash Beats Input |
| 5601 | Kibana |
| 8000 | API Gateway |
| 8761 | Eureka |
| 9001 | User Service |
| 9002 | Catalog Service |
| 9003 | Order Service |
| 9092 | Kafka |
| 9200 | Elasticsearch |
| 9600 | Logstash API |

PowerShell:

```powershell
Get-NetTCPConnection -State Listen |
    Where-Object LocalPort -in 2181,3306,5044,5601,8000,8761,9001,9002,9003,9092,9200,9600 |
    Select-Object LocalAddress,LocalPort,OwningProcess
```

간단히 특정 Port만 확인:

```powershell
netstat -ano | findstr :3306
```

```powershell
netstat -ano | findstr :9092
```

```powershell
netstat -ano | findstr :9200
```

---

# 8. MariaDB Docker 구성

현재 MariaDB Compose:

```yaml
services:
  mariadb:
    image: mariadb:10.11
    container_name: msa-mariadb
    restart: unless-stopped
    ports:
      - "3306:3306"
    environment:
      MARIADB_ROOT_PASSWORD: root1234
      MARIADB_DATABASE: msa_ecommerce
      MARIADB_USER: msa
      MARIADB_PASSWORD: msa1234
      MARIADB_CHARACTER_SET_SERVER: utf8mb4
      MARIADB_COLLATION_SERVER: utf8mb4_unicode_ci
    volumes:
      - msa-mariadb-data:/var/lib/mysql

volumes:
  msa-mariadb-data:
```

---

# 9. MariaDB 실행

프로젝트 Root:

```powershell
cd <PROJECT_ROOT>
```

실행:

```powershell
docker compose -f docker-compose-mariadb.yml up -d
```

Container 확인:

```powershell
docker ps
```

정상 예:

```text
msa-mariadb
```

---

# 10. MariaDB 로그 확인

```powershell
docker logs msa-mariadb --tail 100
```

실시간:

```powershell
docker logs -f msa-mariadb
```

정상적으로 준비되면 MariaDB가 connection을 받을 수 있다는 로그가 나타난다.

---

# 11. MariaDB 접속 테스트

Container 내부에서 바로 접속:

```powershell
docker exec -it msa-mariadb mariadb -u msa -pmsa1234 msa_ecommerce
```

접속 후:

```sql
SHOW DATABASES;
```

```sql
USE msa_ecommerce;
```

```sql
SHOW TABLES;
```

Spring Boot 서비스를 한 번 이상 실행했다면 JPA에 의해 관련 Table이 생성된다.

종료:

```sql
exit;
```

---

# 12. MariaDB Spring 설정

Spring Boot 서비스에서는 Host PC에서 Docker MariaDB를 호출하므로:

```yaml
spring:
  datasource:
    url: jdbc:mariadb://localhost:3306/msa_ecommerce
    username: msa
    password: msa1234
```

형태를 사용한다.

중요:

```text
Spring Boot가 IntelliJ에서 실행됨
        ↓
Docker 외부에서 접속
        ↓
localhost:3306
```

이므로:

```text
mariadb:3306
```

이 아니라:

```text
localhost:3306
```

을 사용한다.

---

# 13. MariaDB 재시작

```powershell
docker restart msa-mariadb
```

또는:

```powershell
docker compose -f docker-compose-mariadb.yml restart
```

---

# 14. MariaDB 종료

Container만 정지:

```powershell
docker compose -f docker-compose-mariadb.yml stop
```

Container 제거:

```powershell
docker compose -f docker-compose-mariadb.yml down
```

`down`을 실행해도 Named Volume은 기본적으로 유지된다.

따라서 DB 데이터는 남아 있다.

---

# 15. MariaDB 완전 초기화

주의:

```powershell
docker compose -f docker-compose-mariadb.yml down -v
```

`-v`는 MariaDB Volume까지 제거한다.

즉:

```text
User
Catalog
Order
Kafka Event Log
```

등 DB 데이터가 모두 삭제될 수 있다.

개발 데이터를 유지하려면 평소에는:

```powershell
docker compose -f docker-compose-mariadb.yml down
```

까지만 사용한다.

---

# 16. Kafka / ZooKeeper Docker 구성

현재 Compose:

```yaml
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.3
    container_name: msa-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.5.3
    container_name: msa-kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
```

중요:

```text
KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092
```

로 설정되어 있다.

Spring Boot가 Docker 밖 IntelliJ에서 실행되기 때문이다.

---

# 17. Kafka / ZooKeeper 실행

프로젝트 Root에서:

```powershell
docker compose -f docker-compose-kafka.yml up -d
```

확인:

```powershell
docker ps
```

정상:

```text
msa-zookeeper
msa-kafka
```

---

# 18. Kafka 기동 순서

Compose의:

```yaml
depends_on:
  - zookeeper
```

설정으로 ZooKeeper가 먼저 실행된다.

전체 흐름:

```text
ZooKeeper
   ↓
Kafka Broker
   ↓
Spring Kafka Producer / Consumer
```

---

# 19. Kafka 로그 확인

ZooKeeper:

```powershell
docker logs msa-zookeeper --tail 100
```

Kafka:

```powershell
docker logs msa-kafka --tail 100
```

실시간 Kafka 로그:

```powershell
docker logs -f msa-kafka
```

---

# 20. Kafka Topic 확인

현재 프로젝트 Topic:

```text
example-catalog-topic
```

Topic 목록:

```powershell
docker exec -it msa-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

정상적으로 주문 이벤트를 한 번 발생시켰다면:

```text
example-catalog-topic
```

이 보여야 한다.

현재:

```text
KAFKA_AUTO_CREATE_TOPICS_ENABLE=true
```

이므로 Topic이 없더라도 Producer가 전송하면서 자동 생성될 수 있다.

---

# 21. Kafka Topic 수동 생성

자동생성에 의존하고 싶지 않다면 직접 생성한다.

```powershell
docker exec -it msa-kafka kafka-topics `
    --bootstrap-server localhost:9092 `
    --create `
    --topic example-catalog-topic `
    --partitions 1 `
    --replication-factor 1
```

이미 존재한다면 오류 메시지가 나올 수 있으나 문제는 아니다.

Topic 상세:

```powershell
docker exec -it msa-kafka kafka-topics `
    --bootstrap-server localhost:9092 `
    --describe `
    --topic example-catalog-topic
```

---

# 22. Kafka Producer 직접 테스트

PowerShell 창 1:

```powershell
docker exec -it msa-kafka kafka-console-producer `
    --bootstrap-server localhost:9092 `
    --topic example-catalog-topic
```

메시지 입력:

```text
test-message
```

Enter.

종료:

```text
Ctrl + C
```

---

# 23. Kafka Consumer 직접 테스트

PowerShell 창 2:

```powershell
docker exec -it msa-kafka kafka-console-consumer `
    --bootstrap-server localhost:9092 `
    --topic example-catalog-topic `
    --from-beginning
```

Producer에서 입력한:

```text
test-message
```

가 출력되면 Kafka Broker 자체는 정상이다.

주의:

실제 Catalog Consumer는 JSON 주문 Event를 기대하므로 임의의 문자열 `test-message`는 Catalog Consumer에서 JSON Parsing 오류를 유발할 수 있다.

따라서 위 테스트는:

```text
Spring Catalog Service가 실행되지 않은 상태
```

에서 수행하는 것을 권장한다.

---

# 24. Spring Kafka 연결 설정

IntelliJ에서 실행되는 Order / Catalog Service:

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
```

또는 Java Config:

```java
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
```

Docker Container 이름:

```text
kafka:9092
```

를 사용하지 않는다.

이유:

```text
Spring Boot → Host OS
Host OS → Docker Port Mapping
```

구조이기 때문이다.

---

# 25. 현재 Kafka 데이터 유지 특성

현재 `docker-compose-kafka.yml`에는 Kafka Data용 Named Volume을 별도로 설정하지 않았다.

따라서:

```text
docker stop / start
```

수준에서는 Container 내부 데이터가 유지될 수 있지만,

```text
docker compose down
```

후 Container를 새로 만들면 Topic / Broker 내부 데이터가 초기화될 수 있다.

포트폴리오 데모 단계에서는 큰 문제가 아니지만, 장기적으로 데이터를 유지하려면 Kafka Volume을 추가하는 것이 좋다.

향후 예:

```yaml
volumes:
  - msa-kafka-data:/var/lib/kafka/data
```

---

# 26. Kafka 종료

```powershell
docker compose -f docker-compose-kafka.yml stop
```

완전히 Container 제거:

```powershell
docker compose -f docker-compose-kafka.yml down
```

---

# 27. ELK 구성

현재 ELK는 다음 4개 Container로 구성한다.

```text
Elasticsearch
Logstash
Filebeat
Kibana
```

흐름:

```text
Spring Boot
    ↓
ECS JSON File
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

# 28. ELK Docker Compose

위치:

```text
<PROJECT_ROOT>\infrastructure\elk\docker-compose-elk.yml
```

현재 구조:

```yaml
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:9.5.3
    container_name: msa-elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - xpack.security.enrollment.enabled=false
      - ES_JAVA_OPTS=-Xms1g -Xmx1g
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  kibana:
    image: docker.elastic.co/kibana/kibana:9.5.3
    container_name: msa-kibana
    environment:
      ELASTICSEARCH_HOSTS: http://elasticsearch:9200
    ports:
      - "5601:5601"

  logstash:
    image: docker.elastic.co/logstash/logstash:9.5.3
    container_name: msa-logstash
    environment:
      LS_JAVA_OPTS: -Xms512m -Xmx512m
    ports:
      - "5044:5044"
      - "9600:9600"

  filebeat:
    image: docker.elastic.co/beats/filebeat:9.5.3
    container_name: msa-filebeat
```

Elastic Stack은:

```text
Elasticsearch
Kibana
Logstash
Filebeat
```

버전을 동일하게 맞추는 것을 기본 원칙으로 한다.

---

# 29. Spring Boot 로그 전제 조건

ELK를 실행하기 전에 다음 JSON 로그가 정상 생성되어야 한다.

```text
apigateway-service/logs/apigateway-service.json
user-service/logs/user-service.json
catalog-service/logs/catalog-service.json
order-service/logs/order-service.json
```

각 서비스의 `pom.xml`:

```xml
<dependency>
    <groupId>co.elastic.logging</groupId>
    <artifactId>logback-ecs-encoder</artifactId>
    <version>1.8.0</version>
</dependency>
```

가 필요하다.

없으면:

```text
ClassNotFoundException:
co.elastic.logging.logback.EcsEncoder
```

가 발생한다.

---

# 30. ELK 실행 전 Elasticsearch Windows 설정

Elasticsearch Container가 다음과 비슷한 오류로 종료될 수 있다.

```text
vm.max_map_count is too low
```

Windows 11 + Docker Desktop + WSL2에서 필요할 경우 관리자 PowerShell:

```powershell
wsl -d docker-desktop -u root sysctl -w vm.max_map_count=1048576
```

환경에 따라 Docker Desktop 재시작 후 다시 설정이 필요할 수 있다.

확인:

```powershell
wsl -d docker-desktop -u root sysctl vm.max_map_count
```

정상 예:

```text
vm.max_map_count = 1048576
```

> Elasticsearch가 정상 기동된다면 이 작업을 굳이 다시 수행할 필요는 없다.

---

# 31. ELK 실행

ELK 폴더로 이동:

```powershell
cd <PROJECT_ROOT>\infrastructure\elk
```

실행:

```powershell
docker compose -f docker-compose-elk.yml up -d
```

최초 실행은 Elastic Docker Image를 다운로드하므로 시간이 더 걸릴 수 있다.

진행 확인:

```powershell
docker ps
```

정상:

```text
msa-elasticsearch
msa-kibana
msa-logstash
msa-filebeat
```

---

# 32. Elasticsearch 정상 확인

로그:

```powershell
docker logs msa-elasticsearch --tail 100
```

브라우저:

```text
http://localhost:9200
```

PowerShell:

```powershell
Invoke-RestMethod http://localhost:9200
```

정상이라면 Elasticsearch Cluster 정보 JSON이 출력된다.

---

# 33. Elasticsearch Health 확인

```powershell
Invoke-RestMethod http://localhost:9200/_cluster/health
```

Single Node 개발환경에서는 Replica 설정 등에 따라:

```text
yellow
```

상태가 나타날 수도 있다.

중요한 것은:

```text
red
```

가 아니고 Elasticsearch가 요청에 응답하는지 확인하는 것이다.

---

# 34. Kibana 확인

로그:

```powershell
docker logs msa-kibana --tail 100
```

브라우저:

```text
http://localhost:5601
```

Kibana는 Elasticsearch보다 준비 시간이 길 수 있다.

---

# 35. Logstash 확인

로그:

```powershell
docker logs msa-logstash --tail 100
```

Logstash API:

```text
http://localhost:9600
```

PowerShell:

```powershell
Invoke-RestMethod http://localhost:9600
```

---

# 36. Filebeat 확인

```powershell
docker logs msa-filebeat --tail 100
```

실시간:

```powershell
docker logs -f msa-filebeat
```

현재 Filebeat는 다음 경로를 수집한다.

```yaml
paths:
  - /workspace/**/logs/*.json
```

Compose:

```yaml
- ../..:/workspace:ro
```

로 Repository Root를 Filebeat Container 내부 `/workspace`로 Mount한다.

즉 Host:

```text
<PROJECT_ROOT>\order-service\logs\order-service.json
```

은 Container 내부:

```text
/workspace/order-service/logs/order-service.json
```

형태로 보인다.

---

# 37. Filebeat → Logstash 설정

현재:

```yaml
output.logstash:
  hosts: ["logstash:5044"]
```

를 사용한다.

Docker 내부 Network에서는 Service Name:

```text
logstash
```

를 DNS 이름으로 사용할 수 있다.

따라서 Filebeat에서는:

```text
localhost:5044
```

가 아니라:

```text
logstash:5044
```

이다.

---

# 38. Logstash → Elasticsearch 설정

현재:

```text
http://elasticsearch:9200
```

으로 전달한다.

Logstash와 Elasticsearch가 같은 Docker Network에 있기 때문이다.

생성 Index:

```text
msa-market-logs-YYYY.MM.dd
```

예:

```text
msa-market-logs-2026.09.08
```

---

# 39. Elasticsearch Index 확인

브라우저:

```text
http://localhost:9200/_cat/indices/msa-market-logs-*?v
```

PowerShell:

```powershell
Invoke-RestMethod 'http://localhost:9200/_cat/indices/msa-market-logs-*?v'
```

Index가 없다면 다음을 순서대로 확인한다.

```text
1. Spring JSON Log가 생성됐는가?
2. Filebeat가 파일을 찾았는가?
3. Filebeat → Logstash 연결이 정상인가?
4. Logstash → Elasticsearch 연결이 정상인가?
```

---

# 40. Kibana Data View 생성

브라우저:

```text
http://localhost:5601
```

이동:

```text
Stack Management
 → Data Views
 → Create data view
```

Name:

```text
MSA Market Logs
```

Index Pattern:

```text
msa-market-logs-*
```

Timestamp:

```text
@timestamp
```

생성 후:

```text
Discover
```

에서 로그를 조회한다.

---

# 41. Kibana 검색 예

Order Service:

```text
service.name : "order-service"
```

Catalog:

```text
service.name : "catalog-service"
```

User:

```text
service.name : "user-service"
```

Gateway:

```text
service.name : "apigateway-service"
```

Error:

```text
log.level : "ERROR"
```

Kafka 관련:

```text
message : *Kafka*
```

특정 Event ID:

```text
message : *eventId값*
```

---

# 42. ELK 종료

ELK 폴더:

```powershell
cd <PROJECT_ROOT>\infrastructure\elk
```

정지:

```powershell
docker compose -f docker-compose-elk.yml stop
```

Container 제거:

```powershell
docker compose -f docker-compose-elk.yml down
```

Elasticsearch Data와 Filebeat Registry Volume은 유지된다.

---

# 43. ELK 데이터 완전 초기화

주의:

```powershell
docker compose -f docker-compose-elk.yml down -v
```

실행 시:

```text
Elasticsearch Index
Filebeat Registry
```

등이 삭제된다.

Kibana에서 확인했던 로그도 Elasticsearch 데이터와 함께 사라진다.

단순 재기동에서는 사용하지 않는다.

---

# 44. 전체 Docker 인프라 기동 순서

권장 순서:

```text
1. MariaDB
2. ZooKeeper
3. Kafka
4. Elasticsearch
5. Logstash
6. Filebeat
7. Kibana
```

Compose 단위로 보면:

```text
MariaDB Compose
       ↓
Kafka Compose
       ↓
ELK Compose
```

---

# 45. 전체 Docker 인프라 실행 명령

프로젝트 Root:

```powershell
cd <PROJECT_ROOT>
```

MariaDB:

```powershell
docker compose -f docker-compose-mariadb.yml up -d
```

Kafka:

```powershell
docker compose -f docker-compose-kafka.yml up -d
```

ELK:

```powershell
docker compose -f infrastructure\elk\docker-compose-elk.yml up -d
```

최종:

```powershell
docker ps
```

정상적으로 최소 다음 Container가 보여야 한다.

```text
msa-mariadb
msa-zookeeper
msa-kafka
msa-elasticsearch
msa-logstash
msa-filebeat
msa-kibana
```

---

# 46. 전체 인프라 상태 한 번에 확인

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

예상:

```text
NAMES               STATUS         PORTS
msa-mariadb         Up             0.0.0.0:3306->3306/tcp
msa-zookeeper       Up             0.0.0.0:2181->2181/tcp
msa-kafka           Up             0.0.0.0:9092->9092/tcp
msa-elasticsearch   Up             0.0.0.0:9200->9200/tcp
msa-logstash        Up             0.0.0.0:5044->5044/tcp
msa-filebeat        Up
msa-kibana          Up             0.0.0.0:5601->5601/tcp
```

---

# 47. Docker 인프라 기동 후 Spring 서비스 실행 순서

Infrastructure가 정상이라면:

```text
1. discoveryservice
2. apigateway-service
3. user-service
4. catalog-service
5. order-service
6. Next.js
```

추천:

```text
Docker Infrastructure
        ↓
Eureka
        ↓
Gateway
        ↓
User
        ↓
Catalog
        ↓
Order
        ↓
Next.js
```

---

# 48. 전체 실행 체크리스트

## Docker

```text
[ ] Docker Desktop 실행
[ ] MariaDB Up
[ ] ZooKeeper Up
[ ] Kafka Up
[ ] Elasticsearch Up
[ ] Logstash Up
[ ] Filebeat Up
[ ] Kibana Up
```

## Backend

```text
[ ] Eureka :8761
[ ] Gateway :8000
[ ] User :9001
[ ] Catalog :9002
[ ] Order :9003
```

## Frontend

```text
[ ] Next.js :3000
```

## Observability

```text
[ ] logs/*.json 생성
[ ] Filebeat 로그 정상
[ ] Logstash 로그 정상
[ ] Elasticsearch Index 생성
[ ] Kibana Discover 조회
```

---

# 49. 전체 기능 테스트 순서

## 49.1 회원가입

```text
Next.js
  ↓
Gateway
  ↓
User Service
  ↓
MariaDB
```

DB 확인:

```sql
SELECT * FROM users;
```

---

## 49.2 로그인

```text
POST /login
  ↓
JWT 발급
  ↓
token / userId Header
```

---

## 49.3 상품 조회

```text
Next.js
  ↓
Gateway
  ↓
Catalog Service
  ↓
MariaDB
```

---

## 49.4 주문

```text
Next.js
  ↓
Gateway
  ↓
Order Service
  ↓
Order DB
  ↓
Kafka Producer
  ↓
Kafka
  ↓
Catalog Consumer
  ↓
stock 감소
```

---

## 49.5 Kafka 확인

```powershell
docker exec -it msa-kafka kafka-topics `
    --bootstrap-server localhost:9092 `
    --describe `
    --topic example-catalog-topic
```

---

## 49.6 주문 취소

```text
Admin
  ↓
Order Service
  ↓
ORDER_CANCELLED
  ↓
Kafka
  ↓
Catalog Consumer
  ↓
stock 복원
```

---

## 49.7 ELK 확인

Kibana:

```text
service.name : "order-service"
```

또는:

```text
message : *Kafka*
```

검색.

---

# 50. 모든 Docker Container 종료

MariaDB:

```powershell
docker compose -f docker-compose-mariadb.yml down
```

Kafka:

```powershell
docker compose -f docker-compose-kafka.yml down
```

ELK:

```powershell
docker compose -f infrastructure\elk\docker-compose-elk.yml down
```

---

# 51. 데이터를 보존하면서 전체 정지

단순히 PC 종료 전에 Container만 멈추고 싶다면:

```powershell
docker stop msa-mariadb
docker stop msa-kafka
docker stop msa-zookeeper
docker stop msa-filebeat
docker stop msa-logstash
docker stop msa-kibana
docker stop msa-elasticsearch
```

다시 시작:

```powershell
docker start msa-mariadb
docker start msa-zookeeper
docker start msa-kafka
docker start msa-elasticsearch
docker start msa-logstash
docker start msa-filebeat
docker start msa-kibana
```

다만 Compose 환경에서는 일반적으로:

```powershell
docker compose ... stop
docker compose ... start
```

방식을 권장한다.

---

# 52. 전체 Container 강제 삭제가 필요한 경우

먼저:

```powershell
docker ps -a
```

특정 Container:

```powershell
docker rm -f msa-kafka
```

```powershell
docker rm -f msa-mariadb
```

정상적인 경우에는 `docker compose down`을 우선 사용한다.

---

# 53. Docker Volume 확인

```powershell
docker volume ls
```

MariaDB:

```text
msa-mariadb-data
```

Elasticsearch:

```text
elasticsearch-data
```

Filebeat:

```text
filebeat-data
```

실제 이름은 Compose Project Name Prefix가 붙어 보일 수 있다.

예:

```text
elk_elasticsearch-data
```

---

# 54. Docker Volume 삭제 주의

개별 Volume 삭제:

```powershell
docker volume rm {volume-name}
```

사용 중인 Volume은 삭제되지 않는다.

DB나 Elasticsearch 데이터를 유지해야 한다면 함부로 삭제하지 않는다.

---

# 55. 사용하지 않는 Docker 자원 정리

확인:

```powershell
docker system df
```

사용하지 않는 Container / Network / Image 일부 정리:

```powershell
docker system prune
```

모든 미사용 Image까지 적극 정리:

```powershell
docker system prune -a
```

주의:

```text
-a
```

옵션은 이후 다시 Image를 다운로드해야 할 수 있으므로 자주 사용할 필요는 없다.

Volume은 기본적으로 자동 삭제되지 않는다.

---

# 56. MariaDB Port 충돌

오류 예:

```text
Bind for 0.0.0.0:3306 failed
port is already allocated
```

확인:

```powershell
netstat -ano | findstr :3306
```

Windows MariaDB/MySQL Service가 이미 실행 중일 수 있다.

서비스 확인:

```powershell
Get-Service | Where-Object {
    $_.Name -match 'mysql|maria'
}
```

기존 Local DB를 중지하거나 Docker Port를 변경해야 한다.

---

# 57. Kafka Port 충돌

```powershell
netstat -ano | findstr :9092
```

기존 Kafka Process 또는 Container가 있을 수 있다.

확인:

```powershell
docker ps -a | findstr kafka
```

---

# 58. Elasticsearch Port 충돌

```powershell
netstat -ano | findstr :9200
```

기존 Elasticsearch가 설치되어 있거나 이전 Container가 실행 중인지 확인한다.

---

# 59. Container Name 충돌

오류:

```text
The container name "/msa-kafka" is already in use
```

확인:

```powershell
docker ps -a | findstr msa-kafka
```

기존 Container 제거:

```powershell
docker rm -f msa-kafka
```

그 후 Compose 재실행.

---

# 60. Elasticsearch가 계속 Restart 되는 경우

확인:

```powershell
docker ps -a
```

로그:

```powershell
docker logs msa-elasticsearch --tail 200
```

주요 원인:

```text
Docker Memory 부족
vm.max_map_count 부족
Volume Permission 문제
잘못된 Elasticsearch 설정
```

우선 Docker Desktop에 충분한 메모리를 할당한다.

---

# 61. Kibana만 접속되지 않는 경우

Elasticsearch 먼저 확인:

```powershell
Invoke-RestMethod http://localhost:9200
```

Elasticsearch가 정상이어야 Kibana도 정상 기동된다.

Kibana 로그:

```powershell
docker logs msa-kibana --tail 200
```

---

# 62. Filebeat에서 로그가 안 들어가는 경우

Host에 로그 파일 존재 확인:

```powershell
Get-ChildItem <PROJECT_ROOT> -Recurse -Filter *.json |
    Where-Object FullName -match '\\logs\\'
```

예:

```text
user-service\logs\user-service.json
order-service\logs\order-service.json
```

없다면 ELK 문제가 아니라 Spring Logback 설정부터 확인한다.

---

# 63. Filebeat Mount 확인

Container 내부:

```powershell
docker exec -it msa-filebeat sh
```

내부에서:

```sh
find /workspace -path '*/logs/*.json'
```

실제 파일이 보이면 Volume Mount는 정상이다.

종료:

```sh
exit
```

---

# 64. Logstash Pipeline 오류

확인:

```powershell
docker logs msa-logstash --tail 200
```

Pipeline 파일:

```text
infrastructure/elk/logstash/pipeline/logstash.conf
```

수정 후:

```powershell
docker restart msa-logstash
```

---

# 65. Kafka Broker 접속 오류

Spring 오류:

```text
Connection to node -1 could not be established
```

확인:

```powershell
docker ps | findstr msa-kafka
```

Kafka 로그:

```powershell
docker logs msa-kafka --tail 200
```

Topic 목록:

```powershell
docker exec -it msa-kafka kafka-topics `
    --bootstrap-server localhost:9092 `
    --list
```

이 명령 자체가 실패한다면 Spring보다 Kafka 인프라 문제를 먼저 해결한다.

---

# 66. MariaDB Connection Refused

Spring 오류:

```text
Connection refused
Could not connect to address=(host=localhost)(port=3306)
```

확인:

```powershell
docker ps | findstr msa-mariadb
```

직접 접속:

```powershell
docker exec -it msa-mariadb mariadb -u msa -pmsa1234 msa_ecommerce
```

이것이 성공하고 Spring만 실패한다면 `application.yml`을 확인한다.

---

# 67. Spring 서비스는 Docker Container Name을 사용하지 않는다

현재 프로젝트는 Spring Boot를 Docker화하지 않았다.

따라서:

```text
jdbc:mariadb://mariadb:3306
kafka:9092
```

가 아니라:

```text
jdbc:mariadb://localhost:3306
localhost:9092
```

를 사용한다.

반대로 Docker 내부 Container끼리는:

```text
filebeat → logstash:5044
logstash → elasticsearch:9200
kafka → zookeeper:2181
```

처럼 Container Service Name을 사용한다.

---

# 68. Host / Docker 주소 구분

정리:

| 호출 주체 | 대상 | 주소 |
|---|---|---|
| Spring Boot | MariaDB Docker | `localhost:3306` |
| Spring Boot | Kafka Docker | `localhost:9092` |
| Browser | Elasticsearch | `localhost:9200` |
| Browser | Kibana | `localhost:5601` |
| Filebeat Docker | Logstash Docker | `logstash:5044` |
| Logstash Docker | Elasticsearch Docker | `elasticsearch:9200` |
| Kafka Docker | ZooKeeper Docker | `zookeeper:2181` |

이 구분을 잘못하면 Docker 환경에서 가장 많은 연결 오류가 발생한다.

---

# 69. 개발 시작 시 추천 명령 세트

PowerShell:

```powershell
cd <PROJECT_ROOT>

docker compose -f docker-compose-mariadb.yml up -d
docker compose -f docker-compose-kafka.yml up -d
docker compose -f infrastructure\elk\docker-compose-elk.yml up -d

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

그 후 IntelliJ:

```text
1. Eureka
2. Gateway
3. User
4. Catalog
5. Order
```

Next.js:

```powershell
cd msa-react-test-ui
npm run dev
```

---

# 70. 개발 종료 시 추천 명령 세트

Spring / Next.js 종료 후:

```powershell
cd <PROJECT_ROOT>

docker compose -f infrastructure\elk\docker-compose-elk.yml stop
docker compose -f docker-compose-kafka.yml stop
docker compose -f docker-compose-mariadb.yml stop
```

데이터를 유지하면서 종료할 목적이면:

```text
stop
```

을 권장한다.

---

# 71. 전체 인프라 초기화가 필요한 경우

정말 처음부터 다시 구성하려는 경우에만 수행한다.

```powershell
docker compose -f infrastructure\elk\docker-compose-elk.yml down -v
docker compose -f docker-compose-kafka.yml down
docker compose -f docker-compose-mariadb.yml down -v
```

그 후:

```powershell
docker compose -f docker-compose-mariadb.yml up -d
docker compose -f docker-compose-kafka.yml up -d
docker compose -f infrastructure\elk\docker-compose-elk.yml up -d
```

주의:

```text
MariaDB Data 삭제
Elasticsearch Index 삭제
Filebeat Registry 삭제
Kafka Container 데이터 초기화 가능
```

---

# 72. 최소 정상 상태 판단 기준

다음 조건이면 Docker Infrastructure는 정상으로 판단할 수 있다.

## MariaDB

```powershell
docker exec -it msa-mariadb mariadb -u msa -pmsa1234 msa_ecommerce
```

성공.

## Kafka

```powershell
docker exec -it msa-kafka kafka-topics `
    --bootstrap-server localhost:9092 `
    --list
```

성공.

## Elasticsearch

```powershell
Invoke-RestMethod http://localhost:9200
```

성공.

## Kibana

브라우저:

```text
http://localhost:5601
```

접속 성공.

## Logstash

```powershell
Invoke-RestMethod http://localhost:9600
```

성공.

## Filebeat

```powershell
docker logs msa-filebeat --tail 100
```

반복적인 connection error 없음.

---

# 73. 프로젝트 최종 테스트 시나리오

Infrastructure:

```text
MariaDB
Kafka
ELK
```

정상 확인 후:

```text
Eureka
Gateway
User
Catalog
Order
Next.js
```

실행.

시나리오:

```text
회원가입
   ↓
로그인
   ↓
상품 조회
   ↓
주문
   ↓
Kafka Event 발생
   ↓
재고 차감
   ↓
Kafka Flow 확인
   ↓
Kibana 로그 확인
   ↓
관리자 주문 취소
   ↓
Kafka ORDER_CANCELLED
   ↓
재고 복원
   ↓
Kibana 로그 확인
```

---

# 74. 현재 단계에서 사용하지 않는 Docker Resource

현재 다음 항목은 필수 Docker Resource가 아니다.

```text
Config Server
RabbitMQ
Redis
Prometheus
Grafana
Zipkin
```

기존 강의 Source에 RabbitMQ / Config Bus 관련 Dependency가 일부 남아 있을 수 있으나 현재 MSA Market 핵심 실행에는 포함하지 않는다.

향후 필요 시 별도 단계로 추가한다.

---

# 75. 향후 Docker 고도화 방향

현재:

```text
Infrastructure만 Docker
Spring Boot / Next.js는 Host 실행
```

구조다.

향후:

```text
Next.js
Gateway
Eureka
User
Catalog
Order
MariaDB
Kafka
ELK
```

전부 Docker Compose로 통합할 수 있다.

최종 목표 예:

```text
docker compose up -d
```

한 번으로 전체 시스템 실행.

다만 현재는 학습/디버깅 편의성을 위해 Spring Boot 서비스를 IntelliJ에서 개별 실행하는 구조를 유지한다.

---

# 76. 향후 Kafka KRaft 전환

현재:

```text
Kafka
  ↓
ZooKeeper
```

방식이다.

Confluent Platform 7.5 계열부터 ZooKeeper는 신규 배포 기준으로 Deprecated 방향이므로, 프로젝트 현대화 단계에서:

```text
Kafka KRaft
```

방식으로 전환할 수 있다.

현재 단계에서는 기존 강의 소스와 설정 변경 범위를 최소화하기 위해 ZooKeeper 방식을 유지한다.

---

# 77. Git에 올려야 하는 파일

다음 설정 파일은 Git에서 관리한다.

```text
docker-compose-mariadb.yml
docker-compose-kafka.yml

infrastructure/elk/docker-compose-elk.yml
infrastructure/elk/filebeat/filebeat.yml
infrastructure/elk/logstash/pipeline/logstash.conf
```

---

# 78. Git에 올리지 말아야 하는 데이터

다음 실제 데이터는 Git에 올리지 않는다.

```text
MariaDB 실제 Data Directory
Kafka Data
Elasticsearch Data
Filebeat Registry
Spring Log Files
.env
```

`.gitignore` 예:

```gitignore
**/logs/
*.log

.env
.env.local

mariadb-data/
kafka-data/
elasticsearch-data/
filebeat-data/
```

Docker Named Volume은 기본적으로 Project Directory에 파일로 생성되지 않으므로 Git에 들어가지는 않는다.

---

# 79. 비밀번호 관리 주의

현재 로컬 학습 환경에서는:

```text
MariaDB root : root1234
MariaDB user : msa
MariaDB pwd  : msa1234
```

처럼 단순한 값을 사용한다.

Public GitHub Portfolio에서는 향후:

```text
.env
```

파일로 분리하는 것이 좋다.

예:

```text
MARIADB_ROOT_PASSWORD=...
MARIADB_DATABASE=msa_ecommerce
MARIADB_USER=msa
MARIADB_PASSWORD=...
```

Compose:

```yaml
env_file:
  - .env
```

실제 `.env`:

```gitignore
.env
```

처리.

Repository에는:

```text
.env.example
```

만 제공한다.

---

# 80. 최종 요약

개발 시작:

```text
Docker Desktop
      ↓
MariaDB
      ↓
Kafka / ZooKeeper
      ↓
ELK
      ↓
Eureka
      ↓
Gateway
      ↓
User / Catalog / Order
      ↓
Next.js
```

핵심 Docker 명령:

```powershell
docker compose -f docker-compose-mariadb.yml up -d

docker compose -f docker-compose-kafka.yml up -d

docker compose -f infrastructure\elk\docker-compose-elk.yml up -d
```

정상 확인:

```powershell
docker ps
```

주요 URL:

```text
Eureka        http://localhost:8761
Gateway       http://localhost:8000
Next.js       http://localhost:3000
Elasticsearch http://localhost:9200
Kibana        http://localhost:5601
Logstash API  http://localhost:9600
```

Docker 기반 Infrastructure만 정상적으로 준비되면 이후 Spring Boot 서비스는 IntelliJ에서 JDK 11로 개별 실행하면서 개발/디버깅할 수 있다.

---

# 81. 공식 문서 참고 사항

본 가이드의 Docker 운영 방식은 Docker Compose V2 기준이며, Elasticsearch는 Windows Docker Desktop/WSL2 환경에서 시스템 설정에 따라 `vm.max_map_count` 설정이 필요할 수 있다.

Kafka는 현재 프로젝트 호환성을 위해 Confluent Platform 7.5.3 + ZooKeeper 구성을 유지한다. 신규 Kafka 환경에서는 KRaft 방식으로 이전하는 것을 향후 개선 항목으로 본다.

Elastic Stack은 프로젝트 현재 설정 기준 Elasticsearch / Logstash / Filebeat / Kibana를 동일한 9.5.3 버전으로 구성한다.
