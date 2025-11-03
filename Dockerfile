# Multi-stage Dockerfile for Natural Flow Backend
# This forces Railway to use Java/Maven, ignoring any Node.js files in root
# Updated: Nov 3, 2025 - Force cache bust for 9 ticker deployment

# Stage 1: Build with Maven
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /build

# Copy only backend files
COPY backend/pom.xml .
COPY backend/src ./src

# Build the application (skip tests for faster builds)
RUN mvn clean package -DskipTests

# Stage 2: Runtime with minimal JRE
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy the built jar from builder stage
COPY --from=builder /build/target/natural-flow-1.0.0.jar app.jar

# Railway will set PORT environment variable
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
