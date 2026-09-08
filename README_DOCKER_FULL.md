# Full Docker Overlay - Quick Start

1. Docker Desktop 정상 확인: `docker run --rm hello-world`
2. 실행: `docker compose -f docker-compose.full.yml up -d --build`
3. 확인: `docker compose -f docker-compose.full.yml ps`
4. Frontend: `http://localhost:3300`
5. Eureka: `http://localhost:8761`
6. Kibana: `http://localhost:5601`

상세 내용은 `FULL_DOCKER_APPLY_GUIDE.md` 참고.
