# Natural Flow

A personal options flow engine backend. Natural Flow ingests and stores all options flow data, but only shows what matters - by ticker, premium threshold, and position building patterns.

## Architecture

- **Language**: Java 17
- **Framework**: Spring Boot 3
- **Build**: Maven
- **Database**: PostgreSQL (prod), H2 (local dev)
- **JSON**: Jackson
- **HTTP**: OkHttp

## Project Structure

```
com.naturalflow/
├── NaturalFlowApplication.java    # Spring Boot main class
├── model/
│   └── OptionFlow.java            # JPA entity for flow events
├── repo/
│   └── FlowRepository.java        # Data access layer
├── service/
│   └── FlowService.java           # Business logic
├── controller/
│   └── FlowController.java        # REST API endpoints
└── config/
    └── SecurityConfig.java        # CORS and API key security
```

## API Endpoints

### GET /api/flow/latest
Get latest flow events for a ticker.
- Query params: `symbol` (required), `limit` (default: 50)
- Returns: `{ symbol, rows[], count }`

### GET /api/flow/summary
Get call/put premium summary for a ticker.
- Query params: `symbol` (required), `windowHours` (default: 24)
- Returns: `{ symbol, windowHours, totalCallPremium, totalPutPremium, netPremium, count }`

### GET /api/flow/building
Get flow events indicating position building (the core "Natural Flow" feature).
- Query params: `symbol` (required), `minPremium` (default: 50000), `lookbackMinutes` (default: 120)
- Returns: Array of flow events meeting the criteria

### POST /api/flow/ingest
Ingest raw JSON from Polygon or other provider.
- Body: Raw JSON string
- Returns: `{ success, id, underlying, message }`

### GET /api/flow/tickers
Get list of distinct tickers seen in last 24h (for UI dropdown).
- Returns: Array of ticker symbols

## Running Locally

```bash
# Run with H2 in-memory database
mvn spring-boot:run

# Access H2 console at http://localhost:8080/h2-console
# JDBC URL: jdbc:h2:mem:naturalflow
# Username: sa
# Password: (leave blank)
```

## Running in Production

```bash
# Set environment variables
export DATABASE_URL=jdbc:postgresql://localhost:5432/naturalflow
export DATABASE_USERNAME=postgres
export DATABASE_PASSWORD=yourpassword
export SECURITY_ENABLED=true
export API_KEY=your-secret-key

# Run with prod profile
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

## Database Schema

See `schema.sql` for the PostgreSQL DDL. Spring Boot will auto-create tables in both H2 and PostgreSQL when using `ddl-auto: update`.

## Security

CORS is enabled for all origins on `/api/**` to allow your Lovable frontend to call the API.

Optional API key protection:
- Set `naturalflow.security.enabled=true` in application.yml or `SECURITY_ENABLED=true` env var
- Set `naturalflow.security.api-key` or `API_KEY` env var
- Include `X-API-KEY` header in all API requests

## Provider Integration

The ingest endpoint (`POST /api/flow/ingest`) currently has basic Polygon JSON mapping in `FlowService.ingestFromRawJson()`. When switching providers, update the TODO-marked section in that method. The raw JSON is always stored in the `raw_json` column.

## Design Principles

1. **Ingest everything** - Store all raw flow data, never throw it away
2. **Filter on query** - Only show what matters when reading
3. **Flat JSON** - Return simple structures for easy UI binding
4. **Provider-agnostic** - Mark provider-specific code with TODOs for easy swapping

## Next Steps

- Connect to actual Polygon API for real-time flow ingestion
- Implement more sophisticated "building" detection (group by strike/expiry)
- Add OpenAI integration for flow summaries
- Deploy to cloud (Heroku, Railway, AWS, etc.)
