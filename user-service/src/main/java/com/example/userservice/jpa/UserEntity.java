package com.example.userservice.jpa;

import lombok.Data;
import javax.persistence.*;

@Data
@Entity
@Table(name = "users")
public class UserEntity {
    public static final String ROLE_USER = "ROLE_USER";
    public static final String ROLE_ADMIN = "ROLE_ADMIN";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50, unique = true)
    private String email;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, unique = true)
    private String userId;

    @Column(nullable = false)
    private String encryptedPwd;

    /**
     * 권한. ddl-auto=update 로 기존 테이블에 컬럼을 추가하는 상황을 고려해 nullable 로 두고,
     * 조회 시점에 null 이면 ROLE_USER 로 간주한다. (UserDataInitializer 가 기동 시 backfill)
     */
    @Column(length = 20)
    private String role = ROLE_USER;

    /** null 안전한 권한 조회. */
    public String resolveRole() {
        return (role == null || role.trim().isEmpty()) ? ROLE_USER : role;
    }
}
