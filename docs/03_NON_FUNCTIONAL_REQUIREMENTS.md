# 03. NON-FUNCTIONAL REQUIREMENTS (NFR)

> **Document ID:** `DOC-03`
> **Parent Document:** [PROJECT_MASTER_PLAN.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/PROJECT_MASTER_PLAN.md)
> **Version:** `1.0.0`

---

## 1. Benchmark Assumptions & Testing Conditions

All quantitative performance and scalability targets in this document are defined under the following explicit baseline environment (unless stated otherwise):
- **Hardware Baseline:** 2 vCPU, 4 GB RAM application container + 2 vCPU, 4 GB RAM PostgreSQL 16 instance on SSD storage.
- **Dataset Baseline:** $10,000$ products, $35,000$ product variants, $100,000$ registered users, and $250,000$ historical orders.
- **Load Baseline:** 100 concurrent active virtual users (VUs) sustained over a 15-minute k6 load test with a realistic e-commerce mix (70% browse/search, 15% cart/wishlist, 10% AI chat, 5% checkout).

---

## 2. Measurable Non-Functional Requirements Matrix

### 2.1 Performance (`NFR-PERF-*`)

| ID | Metric | Target SLA | Verification Method |
| :--- | :--- | :--- | :--- |
| `NFR-PERF-001` | **Catalog & Search API Latency** (`GET /api/v1/products`) | $p50 \le 80\text{ms}$, $p95 \le 250\text{ms}$, $p99 \le 450\text{ms}$ | k6 load test + PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` |
| `NFR-PERF-002` | **Autocomplete Suggestions Latency** (`GET /api/v1/products/suggestions`) | $p95 \le 150\text{ms}$ | k6 load test |
| `NFR-PERF-003` | **Transactional Checkout Latency** (`POST /api/v1/checkout/place-order`) | $p95 \le 500\text{ms}$ (excluding external payment gateway redirect) | Supertest + k6 concurrent checkout test |
| `NFR-PERF-004` | **Frontend Core Web Vitals** (Storefront & 360° Wheel) | LCP $\le 2.0\text{s}$, INP $\le 150\text{ms}$, CLS $\le 0.05$; 360° Wheel rotation at $60\text{ FPS}$ (`translate3d` GPU-accelerated) | Lighthouse CI + Chrome DevTools Performance profile |
| `NFR-PERF-005` | **AI Shopping Assistant Response Latency** | First token / tool status indicator $\le 1.2\text{s}$; full tool-grounded response $p95 \le 4.5\text{s}$ | `ai_usage_logs.latency_ms` telemetry |

### 2.2 Scalability (`NFR-SCAL-*`)

| ID | Requirement | Target Specification |
| :--- | :--- | :--- |
| `NFR-SCAL-001` | **Stateless Horizontal Scaling** | Backend NestJS instances must store zero in-memory session state (JWT + PostgreSQL persistence + Cloudinary media), allowing horizontal scaling behind a load balancer from 1 to $N$ replicas. |
| `NFR-SCAL-002` | **Database Connection Pooling** | Prisma connection pool configured with bounded `connection_limit` (default `15` per app instance) to prevent exhausting PostgreSQL `max_connections`. |
| `NFR-SCAL-003` | **Pagination Enforcement** | Every list endpoint must enforce a maximum page size (`limit <= 50` for public APIs, `limit <= 100` for admin APIs) — unbounded `findMany()` queries on transactional tables are prohibited. |

### 2.3 Availability & Reliability (`NFR-REL-*`)

| ID | Requirement | Target Specification |
| :--- | :--- | :--- |
| `NFR-REL-001` | **Core Commerce Uptime** | $\ge 99.9\%$ availability for browsing, cart, and checkout endpoints. |
| `NFR-REL-002` | **AI Graceful Degradation** | Circuit breaker & timeout (`8,000ms`) on Gemini API calls: if Gemini is unavailable or rate-limited, the `/api/v1/ai/chat` endpoint returns a structured fallback message with direct search links and never crashes or blocks the main API event loop. |
| `NFR-REL-003` | **Idempotent Mutations** | Checkout (`Idempotency-Key`) and Payment Webhooks (`provider_transaction_id`) guarantee at-most-once financial execution under network retries. |

### 2.4 Data Consistency & Financial Integrity (`NFR-CONS-*`)

| ID | Requirement | Target Specification |
| :--- | :--- | :--- |
| `NFR-CONS-001` | **Zero Floating-Point Arithmetic** | 100% of currency columns use `DECIMAL(15, 2)` in PostgreSQL and `Prisma.Decimal` in application logic. |
| `NFR-CONS-002` | **ACID Inventory Locking** | Concurrent checkouts for overlapping SKUs acquire row locks (`SELECT ... FOR UPDATE`) ordered deterministically by `variant_id ASC` to prevent both overselling and deadlocks. |
| `NFR-CONS-003` | **Zero Orphaned Financial Records** | Foreign keys on `orders`, `order_items`, `payments`, `payment_transactions`, and `inventory_transactions` use `ON DELETE RESTRICT` to prevent accidental deletion of historical ledger data. |

### 2.5 Security (`NFR-SEC-*`)

| ID | Requirement | Target Specification |
| :--- | :--- | :--- |
| `NFR-SEC-001` | **Password Hashing** | Argon2id (or Bcrypt cost $\ge 12$); legacy SHA-256 hashes (if any exist during migration) are transparently upgraded on next valid login. |
| `NFR-SEC-002` | **Token Security** | Access Token TTL $\le 15$ minutes; Refresh Token rotation with family revocation on reuse detection. |
| `NFR-SEC-003` | **API Rate Limiting** | Auth endpoints: 10 req/min/IP; AI Chat endpoint: 15 req/min/user (or IP); Public read endpoints: 120 req/min/IP. |
| `NFR-SEC-004` | **Media Upload Hardening** | Max image size 5 MB; MIME + magic-byte validation (`image/jpeg`, `image/png`, `image/webp`); re-encoded via `Sharp` to strip EXIF/metadata before streaming to Cloudinary. |

### 2.6 Accessibility & Usability (`NFR-A11Y-*`)

| ID | Requirement | Target Specification |
| :--- | :--- | :--- |
| `NFR-A11Y-001` | **WCAG 2.1 Level AA Compliance** | Color contrast ratio $\ge 4.5:1$ for normal text and $\ge 3:1$ for large text/UI components on the Light Mode palette. |
| `NFR-A11Y-002` | **Keyboard & Screen Reader Support** | The 360° Rotating Product Wheel supports keyboard arrow navigation (`ArrowLeft`/`ArrowRight`), explicit `aria-label` attributes on each orbiting card, and `prefers-reduced-motion: reduce` support. |
| `NFR-A11Y-003` | **Responsive Breakpoints** | Full usability across Mobile ($360\text{px}–767\text{px}$), Tablet ($768\text{px}–1023\text{px}$), and Desktop ($1024\text{px}–1920\text{px}+$). |

### 2.7 Maintainability & Observability (`NFR-MAINT-*`)

| ID | Requirement | Target Specification |
| :--- | :--- | :--- |
| `NFR-MAINT-001` | **TypeScript Strictness** | `strict: true`, `noImplicitAny: true`, zero `tsc --noEmit` errors across backend and frontend. |
| `NFR-MAINT-002` | **Structured Logging & Correlation** | Every HTTP request receives a `X-Request-Id` correlation ID logged in structured JSON format alongside latency, status code, and error stack (with PII/passwords redacted). |
| `NFR-MAINT-003` | **Health Check Readiness** | `GET /api/v1/health` reports application uptime, PostgreSQL connectivity latency, and Cloudinary configuration status. |

