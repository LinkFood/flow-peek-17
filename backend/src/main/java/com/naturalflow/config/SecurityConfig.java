package com.naturalflow.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.IOException;

@Configuration
public class SecurityConfig implements WebMvcConfigurer {

    @Value("${naturalflow.security.enabled:false}")
    private boolean securityEnabled;

    @Value("${naturalflow.security.api-key:}")
    private String configuredApiKey;

    /**
     * Ensure the API key filter is registered in the servlet filter chain.
     */
    @Bean
    public FilterRegistrationBean<ApiKeyFilter> apiKeyFilterRegistration() {
        FilterRegistrationBean<ApiKeyFilter> registration = new FilterRegistrationBean<>(new ApiKeyFilter());
        registration.addUrlPatterns("/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }

    /**
     * Enable CORS for all /api/** endpoints so the Lovable/frontend client can call the backend.
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("*")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .exposedHeaders("X-Total-Count")
            .maxAge(3600);
    }

    /**
     * Simple API key filter.
     * If naturalflow.security.enabled=true, require X-API-KEY header. Otherwise allow all requests.
     */
    private class ApiKeyFilter extends OncePerRequestFilter {

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                       FilterChain filterChain) throws ServletException, IOException {

            if (!securityEnabled) {
                filterChain.doFilter(request, response);
                return;
            }

            String path = request.getRequestURI();
            if (!path.startsWith("/api/")) {
                filterChain.doFilter(request, response);
                return;
            }

            String providedKey = request.getHeader("X-API-KEY");
            if (providedKey == null || !providedKey.equals(configuredApiKey)) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\": \"Invalid or missing API key\"}");
                return;
            }

            filterChain.doFilter(request, response);
        }
    }
}
