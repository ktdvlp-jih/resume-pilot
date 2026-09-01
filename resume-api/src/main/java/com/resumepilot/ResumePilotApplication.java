package com.resumepilot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ResumePilotApplication {

    public static void main(String[] args) {
        SpringApplication.run(ResumePilotApplication.class, args);
    }
}
