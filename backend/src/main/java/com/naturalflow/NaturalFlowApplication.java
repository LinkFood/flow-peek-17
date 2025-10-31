package com.naturalflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class NaturalFlowApplication {

    public static void main(String[] args) {
        SpringApplication.run(NaturalFlowApplication.class, args);
    }

}
