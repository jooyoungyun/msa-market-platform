package com.example.userservice.dto;

import com.example.userservice.vo.ResponseOrder;
import lombok.Data;

import java.util.Date;
import java.util.List;

@Data
public class UserDto {
    private String email;
    private String name;
    private String pwd;
    private String userId;
    private Date createdAt;

    /** ROLE_USER / ROLE_ADMIN. 가입 요청으로는 지정할 수 없고 서버가 결정한다. */
    private String role;

    private String decryptedPwd;

    private String encryptedPwd;

    private List<ResponseOrder> orders;
}
