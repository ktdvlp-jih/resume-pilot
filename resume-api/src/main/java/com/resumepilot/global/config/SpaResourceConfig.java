package com.resumepilot.global.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.Ordered;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

@Configuration
@ConditionalOnProperty(name = "app.spa.enabled", havingValue = "true")
public class SpaResourceConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.setOrder(Ordered.LOWEST_PRECEDENCE);
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        if (resourcePath.startsWith("api/")
                                || resourcePath.startsWith("swagger-ui")
                                || resourcePath.startsWith("api-docs")
                                || resourcePath.startsWith("actuator")) {
                            return null;
                        }
                        Resource requested = location.createRelative(resourcePath);
                        if (requested.exists() && requested.isReadable()) {
                            return requested;
                        }
                        // assets/*.js|.css 등 — 없으면 index.html fallback 금지 (MIME 오류 방지)
                        if (resourcePath.startsWith("assets/")
                                || resourcePath.contains(".")) {
                            return null;
                        }
                        if (resourcePath.startsWith("admin") || resourcePath.startsWith("admin/")) {
                            return location.createRelative("admin/index.html");
                        }
                        return location.createRelative("index.html");
                    }
                });
    }
}
