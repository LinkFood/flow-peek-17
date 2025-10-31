package com.naturalflow.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
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
     * Enable CORS for all /api/** endpoints
     * This allows your Lovable frontend to call the API from a different origin
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
     * Simple API key filter
     * If naturalflow.security.enabled=true, require X-API-KEY header
     * Otherwise, allow all requests through
     */
    @Configuration
    public class ApiKeyFilter extends OncePerRequestFilter {

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                       FilterChain filterChain) throws ServletException, IOException {

            // Skip security check if not enabled
            if (!securityEnabled) {
                filterChain.doFilter(request, response);
                return;
            }

            // Check if this is an API endpoint
            String path = request.getRequestURI();
            if (!path.startsWith("/api/")) {
                filterChain.doFilter(request, response);
                return;
            }

            // Verify API key
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
