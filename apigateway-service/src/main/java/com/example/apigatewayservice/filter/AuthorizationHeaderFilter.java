package com.example.apigatewayservice.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Arrays;
import java.util.List;

/**
 * JWT 를 검증하고, 라우트가 요구하는 권한(Role)까지 확인하는 게이트웨이 필터.
 *
 * <pre>
 * filters:
 *   - AuthorizationHeaderFilter          # 로그인만 하면 통과
 *   - AuthorizationHeaderFilter=ADMIN    # ROLE_ADMIN 만 통과
 * </pre>
 *
 * 검증에 성공하면 하위 서비스가 신뢰할 수 있도록 사용자 정보를 헤더로 덮어써서 전달한다.
 * (클라이언트가 같은 헤더를 위조해 보내도 여기서 교체되므로 무력화된다)
 */
@Component
@Slf4j
public class AuthorizationHeaderFilter extends AbstractGatewayFilterFactory<AuthorizationHeaderFilter.Config> {

    public static final String USER_ID_HEADER = "X-Auth-User-Id";
    public static final String USER_ROLE_HEADER = "X-Auth-User-Role";

    private static final String ROLE_PREFIX = "ROLE_";
    private static final String DEFAULT_ROLE = "ROLE_USER";

    private final Environment env;

    public AuthorizationHeaderFilter(Environment env) {
        super(Config.class);
        this.env = env;
    }

    @Data
    public static class Config {
        /** 이 라우트를 통과하는 데 필요한 권한. 비어 있으면 인증만 확인한다. */
        private String requiredRole;
    }

    /** yml 에서 {@code AuthorizationHeaderFilter=ADMIN} 축약 표기를 쓰기 위한 설정. */
    @Override
    public List<String> shortcutFieldOrder() {
        return Arrays.asList("requiredRole");
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();
            String authorizationHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

            if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
                return onError(exchange, HttpStatus.UNAUTHORIZED,
                        "Authorization 헤더가 없거나 Bearer 형식이 아님");
            }

            Claims claims = parseClaims(authorizationHeader.substring(7).trim());
            if (claims == null) {
                return onError(exchange, HttpStatus.UNAUTHORIZED, "JWT 검증 실패");
            }

            String userId = claims.getSubject();
            if (userId == null || userId.trim().isEmpty()) {
                return onError(exchange, HttpStatus.UNAUTHORIZED, "JWT subject 없음");
            }

            String role = claims.get("role", String.class);
            if (role == null || role.trim().isEmpty()) {
                role = DEFAULT_ROLE;
            }

            String requiredRole = normalize(config.getRequiredRole());
            if (requiredRole != null && !requiredRole.equals(role)) {
                return onError(exchange, HttpStatus.FORBIDDEN, String.format(
                        "권한 부족 userId=%s, role=%s, required=%s, path=%s",
                        userId, role, requiredRole, request.getPath()));
            }

            ServerHttpRequest mutated = request.mutate()
                    .header(USER_ID_HEADER, userId)
                    .header(USER_ROLE_HEADER, role)
                    .build();

            return chain.filter(exchange.mutate().request(mutated).build());
        };
    }

    /** "ADMIN", "admin", "ROLE_ADMIN" 을 모두 "ROLE_ADMIN" 으로 맞춘다. */
    private String normalize(String role) {
        if (role == null || role.trim().isEmpty()) return null;
        String upper = role.trim().toUpperCase();
        return upper.startsWith(ROLE_PREFIX) ? upper : ROLE_PREFIX + upper;
    }

    private Claims parseClaims(String jwt) {
        String secret = env.getProperty("token.secret");
        if (secret == null || secret.trim().isEmpty() || jwt.isEmpty()) return null;

        try {
            return Jwts.parser()
                    .setSigningKey(secret)
                    .parseClaimsJws(jwt)
                    .getBody();
        } catch (Exception ex) {
            log.debug("JWT 파싱/검증 실패: {}", ex.getMessage());
            return null;
        }
    }

    private Mono<Void> onError(ServerWebExchange exchange, HttpStatus status, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        log.warn("Gateway 인가 거부 [{}] {}", status.value(), message);
        return response.setComplete();
    }
}
