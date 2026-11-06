# 14. DEPLOYMENT & DEVOPS GUIDE

> **Document ID:** `DOC-14`
> **Parent Document:** [PROJECT_MASTER_PLAN.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/PROJECT_MASTER_PLAN.md)
> **Version:** `1.0.0`

---

## 1. Environment Variables Specification (`.env.example`)

All environment variables are validated at application bootstrap using a strict Zod schema (`src/config/env.validation.ts`). Missing or invalid variables fail fast with a clear diagnostic message.

```ini
# --- APPLICATION ---
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1
FRONTEND_URL=http://localhost:5173

# --- DATABASE (POSTGRESQL 16 + PRISMA) ---
POSTGRES_URL=postgresql://postgres:your_password@localhost:5432/shopping_cart_be?schema=public
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_password
PG_DATABASE=shopping_cart_be

# --- AUTHENTICATION & SECURITY ---
JWT_ACCESS_SECRET=replace_with_64_char_random_hex_secret_for_access_token
JWT_REFRESH_SECRET=replace_with_64_char_random_hex_secret_for_refresh_token
JWT_ACTION_SECRET=replace_with_64_char_random_hex_secret_for_email_and_reset
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# --- CLOUDINARY MEDIA CDN ---
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=shopping_cart_be

# --- AI SHOPPING ASSISTANT (GOOGLE GEMINI) ---
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
AI_DAILY_MAX_COST_USD=10.00
AI_TIMEOUT_MS=8000

# --- PAYMENT GATEWAYS ---
PAYMENT_WEBHOOK_SECRET=replace_with_webhook_hmac_secret
VNPAY_TMN_CODE=sandbox_tmn
VNPAY_HASH_SECRET=sandbox_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

---

## 2. Docker & Docker Compose Architecture

### 2.1 `docker-compose.yml` (Local & Staging Stack)

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: techcart_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${PG_USER:-postgres}
      POSTGRES_PASSWORD: ${PG_PASSWORD:-postgres}
      POSTGRES_DB: ${PG_DATABASE:-shopping_cart_be}
    ports:
      - "${PG_PORT:-5432}:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${PG_USER:-postgres} -d ${PG_DATABASE:-shopping_cart_be}"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: techcart_backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    env_file:
      - .env
    environment:
      POSTGRES_URL: postgresql://${PG_USER:-postgres}:${PG_PASSWORD:-postgres}@postgres:5432/${PG_DATABASE:-shopping_cart_be}?schema=public
    ports:
      - "3000:3000"
    command: >
      sh -c "npx prisma migrate deploy && node dist/main.js"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend
    container_name: techcart_frontend
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "8080:80"

volumes:
  pg_data:
```

---

## 3. CI/CD Pipeline Strategy (GitHub Actions)

Every Pull Request and push to `main` executes a 5-stage automated pipeline (`.github/workflows/ci.yml`):

```mermaid
flowchart LR
    S1["1. Lint & Typecheck\n(ESLint + Prettier + tsc --noEmit)"] --> S2["2. Prisma Schema Validate\n(prisma validate + migrate deploy on Test DB)"]
    S2 --> S3["3. Unit & Integration Tests\n(Jest + Supertest + Concurrency Suite)"]
    S3 --> S4["4. E2E Browser Tests\n(Playwright Headless)"]
    S4 --> S5["5. Build & Docker Image Publish\n(Multi-stage Production Image)"]
```

---

## 4. Database Backup, Rollback & Operational Runbook

1. **Automated Daily Backups:**
   - Execute `pg_dump -Fc --no-acl --no-owner -h $PG_HOST -U $PG_USER $PG_DATABASE > backup_$(date +%F).dump` daily and retain 30 days of encrypted snapshots.
2. **Zero-Downtime Migration Discipline:**
   - Never rename or drop a column in a single step if live containers reference it. Use expand-and-contract migrations.
3. **Health & Readiness Probes:**
   - `GET /api/v1/health` executes `SELECT 1` on PostgreSQL and verifies memory/uptime before routing traffic to the container.

