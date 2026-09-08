package com.example.userservice.vo;

import lombok.Data;

@Data
public class RequestUserUpdate {
    private String email;
    private String name;
    private String pwd;
}
