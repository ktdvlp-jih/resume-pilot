package com.resumepilot.global.config;

import com.resumepilot.infrastructure.security.CustomUserDetailsService;
import com.resumepilot.infrastructure.security.InternalApiAuthFilter;
import com.resumepilot.infrastructure.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final InternalApiAuthFilter internalApiAuthFilter;
    private final CustomUserDetailsService userDetailsService;

    @Value("${cors.allowed-origins:http://localhost:5173,http://localhost:5174}")
    private String allowedOrigins;

    @Value("${app.spa.enabled:false}")
    private boolean spaEnabled;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers("/api/v1/auth/**").permitAll()
                            .requestMatchers("/api/v1/internal/**").permitAll()
                            .requestMatchers("/swagger-ui/**", "/api-docs/**", "/actuator/health").permitAll()
                            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                            .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                            .requestMatchers("/api/**").authenticated();
                    if (spaEnabled) {
                        auth.anyRequest().permitAll();
                    } else {
                        auth.anyRequest().authenticated();
                    }
                })
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(internalApiAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                        .accessDeniedHandler((request, response, accessDenied) -> {
                            var auth = org.springframework.security.core.context.SecurityContextHolder
                                    .getContext().getAuthentication();
                            boolean anonymous = auth == null || !auth.isAuthenticated()
                                    || "anonymousUser".equals(auth.getPrincipal());
                            response.setStatus(anonymous ? HttpStatus.UNAUTHORIZED.value()
                                    : HttpStatus.FORBIDDEN.value());
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            String code = anonymous ? "UNAUTHORIZED" : "FORBIDDEN";
                            String message = anonymous ? "Authentication required" : "Access denied";
                            response.getWriter().write(
                                    "{\"success\":false,\"error\":{\"code\":\"" + code
                                            + "\",\"message\":\"" + message + "\"}}");
                        }));
        return http.build();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        var origins = List.of(allowedOrigins.split(",")).stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        // allowedOrigins + allowedOriginPatterns 동시 사용 시 Quick Tunnel 등에서 CORS 403 가능 → patterns만 사용
        var patterns = new ArrayList<String>();
        patterns.add("https://*.trycloudflare.com");
        patterns.add("http://localhost:*");
        patterns.add("http://127.0.0.1:*");
        patterns.add("http://192.168.*:*");
        patterns.add("https://192.168.*:*");
        patterns.addAll(origins);
        config.setAllowedOriginPatterns(patterns);

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
