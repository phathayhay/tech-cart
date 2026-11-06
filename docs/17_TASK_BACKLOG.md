# 17. MASTER ENGINEERING TASK BACKLOG

> **Document ID:** `DOC-17`
> **Parent Document:** [PROJECT_MASTER_PLAN.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/PROJECT_MASTER_PLAN.md)
> **Version:** `1.0.0`

---

## Status Legend
- `COMPLETED`: Implemented, verified, and documented.
- `IN_PROGRESS`: Currently under active implementation.
- `REVIEW`: Awaiting QA or user review.
- `BLOCKED`: Waiting on external dependency or decision.
- `NOT_STARTED`: Queued for upcoming phase.

---

## PHASE 0 — Discovery, Analysis & Master Documentation

| Task ID | Module | Task Title & Technical Details | Priority | Dependencies | Expected Files | Testing / Verification | Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `TASK-001` | Governance | Audit existing Express/PG/Cloudinary/SPA repository and document baseline gaps | `P0` | None | `docs/00_PROJECT_OVERVIEW.md` | Baseline verified against `src/` & `public/` | `COMPLETED` |
| `TASK-002` | Business & FRS | Author Business Requirements, 20-Module Functional Requirements (`FR-*`), and NFR SLAs (`NFR-*`) | `P0` | `TASK-001` | `docs/01_BUSINESS_REQUIREMENTS.md`, `docs/02_FUNCTIONAL_REQUIREMENTS.md`, `docs/03_NON_FUNCTIONAL_REQUIREMENTS.md` | Cross-check all 20 modules & unique IDs | `COMPLETED` |
| `TASK-003` | Architecture & DB | Design Modular Monolith architecture, 38-table PostgreSQL schema (`schema.prisma`), and Mermaid ERD | `P0` | `TASK-002` | `docs/04_SYSTEM_ARCHITECTURE.md`, `docs/05_DATABASE_DESIGN.md`, `docs/06_DATABASE_RELATIONSHIPS.md` | Validate 1:1 consistency between ERD and Prisma models | `COMPLETED` |
| `TASK-004` | Domain & API | Specify Checkout/Inventory/Payment workflows, REST `/api/v1` contracts, RBAC, and AI Assistant | `P0` | `TASK-003` | `docs/07_BUSINESS_LOGIC.md` through `docs/12_SECURITY_REQUIREMENTS.md` | Verify `DECIMAL(15,2)` math & AI tool boundaries | `COMPLETED` |
| `TASK-005` | QA, DevOps & Plan | Author Testing Strategy, Deployment Guide, Guidelines, Roadmap, Backlog, Acceptance Criteria, Risk Register, Changelog & Master Plan | `P0` | `TASK-004` | `docs/13_TESTING_STRATEGY.md` through `docs/20_CHANGELOG.md`, `docs/PROJECT_MASTER_PLAN.md` | All 22 Markdown files present in `docs/` | `COMPLETED` |

---

## PHASE 1 — Foundation & Workspace Setup

| Task ID | Module | Task Title & Technical Details | Priority | Dependencies | Expected Files | Testing / Verification | Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `TASK-006` | Foundation | Initialize NestJS TypeScript architecture, Zod `.env` validation, Swagger OpenAPI (`/api/v1/docs`), and Helmet/CORS | `P0` | `TASK-005` | `src/main.ts`, `src/app.module.ts`, `src/config/env.validation.ts` | `npx tsc --noEmit` & boot check | `COMPLETED` |
| `TASK-007` | Common | Implement Global `ValidationPipe`, `AllExceptionsFilter`, `RequestIdInterceptor`, and `Decimal` money helper utility | `P0` | `TASK-006` | `src/common/filters/all-exceptions.filter.ts`, `src/common/utils/money.util.ts` | Unit test `money.util.spec.ts` | `COMPLETED` |
| `TASK-008` | Frontend Setup | Scaffold `frontend/` with React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, and API client | `P0` | `TASK-006` | `frontend/package.json`, `frontend/src/lib/api-client.ts`, `frontend/src/styles/globals.css` | Vite build & typecheck pass | `COMPLETED` |
| `TASK-009` | Observability | Implement `HealthModule` (`GET /api/v1/health`) probing PostgreSQL latency and Cloudinary status | `P1` | `TASK-006` | `src/modules/health/health.controller.ts` | `GET /api/v1/health` returns `200 OK` | `COMPLETED` |

---

## PHASE 2 — Database Design & Prisma Setup

| Task ID | Module | Task Title & Technical Details | Priority | Dependencies | Expected Files | Testing / Verification | Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `TASK-010` | Database | Create `prisma/schema.prisma` with all 38 normalized tables, enums, `Decimal(15,2)` columns, and indexes | `P0` | `TASK-006` | `prisma/schema.prisma`, `src/prisma/prisma.service.ts` | `npx prisma validate` passes | `COMPLETED` |
| `TASK-011` | Database | Generate initial migration + custom SQL `CHECK` constraints (`quantity_on_hand >= quantity_reserved`) & `tsvector` GIN index | `P0` | `TASK-010` | `prisma/migrations/*` | `npx prisma migrate deploy` succeeds | `COMPLETED` |
| `TASK-012` | Seed Data | Implement idempotent `prisma/seed.ts` (Roles, Permissions, Users, Categories, 12 Products + Variants + Inventory, Vouchers, Store Policies) | `P0` | `TASK-011` | `prisma/seed.ts` | `npx prisma db seed` runs twice idempotently | `COMPLETED` |

---

## PHASE 3 — Authentication, Users & RBAC

| Task ID | Module | Task Title & Technical Details | Priority | Dependencies | Expected Files | Testing / Verification | Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `TASK-013` | Auth (`M01`) | Implement Bcrypt/Argon2id hashing service with automatic legacy `SHA-256` upgrade on login | `P0` | `TASK-012` | `src/modules/auth/password.service.ts` | Unit test verifying both bcrypt & legacy SHA-256 upgrade | `COMPLETED` |
| `TASK-014` | Auth (`M01`) | Implement Register, Login (with failed-attempt lockout), Logout, Email Verify, Forgot/Reset Password | `P0` | `TASK-013` | `src/modules/auth/auth.controller.ts`, `src/modules/auth/auth.service.ts` | Supertest `/api/v1/auth/*` suite | `COMPLETED` |
| `TASK-015` | Auth (`M01`) | Implement Rotating Refresh Tokens (`family_id`) and reuse detection revoking compromised token family | `P0` | `TASK-014` | `src/modules/auth/auth.service.ts` | Integration test for token reuse revocation | `COMPLETED` |
| `TASK-016` | RBAC (`M01`) | Implement `JwtAuthGuard`, `@OptionalAuth()`, `PermissionsGuard`, and `@RequirePermissions()` decorator | `P0` | `TASK-014` | `src/common/guards/jwt-auth.guard.ts`, `src/common/guards/permissions.guard.ts` | Guard unit & integration tests | `COMPLETED` |
| `TASK-017` | Users (`M02`) | Implement User Profile CRUD, Password Change, and Shipping Address Book (`user_addresses` single-default transaction) | `P0` | `TASK-016` | `src/modules/users/users.controller.ts`, `src/modules/users/users.service.ts` | Supertest address default-toggle test | `COMPLETED` |
| `TASK-018` | Media | Migrate Sharp + Cloudinary memory-stream upload service into NestJS `MediaModule` with magic-byte validation | `P0` | `TASK-016` | `src/modules/media/media.service.ts`, `src/modules/media/media.controller.ts` | Upload test returning HTTPS Cloudinary URL | `COMPLETED` |
| `TASK-019` | Frontend Auth | Build React Auth pages (Login, Register, Forgot/Reset Password) + Profile & Address Book UI | `P0` | `TASK-008`, `TASK-017` | `frontend/src/components/auth/AuthModal.tsx`, `frontend/src/components/account/AccountModal.tsx` | Form validation & token refresh interceptor check | `COMPLETED` |
| `TASK-019B` | Google OAuth (`M01`) | Integrate Google OAuth 2.0 Sign-In & Account Linking (`google_id`, `/api/v1/auth/google/*`, Frontend Google Button) | `P0` | `TASK-014`, `TASK-019` | `prisma/schema.prisma`, `src/modules/auth/google-oauth.service.ts`, `frontend/src/components/auth/AuthModal.tsx`, `public/views/auth.html` | Integration test for Google Sign-In creation & account linking | `COMPLETED` |

---

## PHASE 4 — Product Catalog, Categories, Variants & Search

| Task ID | Module | Task Title & Technical Details | Priority | Dependencies | Expected Files | Testing / Verification | Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `TASK-020` | Categories (`M04`) | Implement hierarchical Category CRUD, circular-parent prevention, and nested tree query with counts | `P0` | `TASK-012` | `src/modules/categories/categories.service.ts` | Supertest `/api/v1/categories` | `NOT_STARTED` |
| `TASK-021` | Products (`M03`,`M05`) | Implement Products, Variants (`product_variants`), Attributes, and Cloudinary gallery endpoints | `P0` | `TASK-020` | `src/modules/products/products.service.ts`, `src/modules/products/variants.service.ts` | Variant attribute uniqueness & Decimal price tests | `NOT_STARTED` |
| `TASK-022` | Search (`M06`) | Implement PostgreSQL FTS (`tsvector`) + faceted filtering (category, brand, price, rating, stock) + autocomplete | `P0` | `TASK-021` | `src/modules/products/product-search.service.ts` | Latency $< 250\text{ms}$ & facet accuracy tests | `NOT_STARTED` |
| `TASK-023` | Frontend Wheel | Port interactive **360° Rotating Product Wheel Showcase** (`<ProductWheelShowcase />`) to React + TypeScript | `P0` | `TASK-008`, `TASK-021` | `frontend/src/components/wheel/ProductWheelShowcase.tsx` | Click, drag, wheel-scroll, and arrow-key tests | `NOT_STARTED` |
| `TASK-024` | Frontend Catalog | Build Catalog Filter Grid Page (`/products`), Autocomplete Header, and Product Detail Page (`/products/:slug`) with Variant Picker | `P0` | `TASK-022`, `TASK-023` | `frontend/src/pages/catalog/*`, `frontend/src/pages/product-detail/*` | Variant switching updates live SKU, stock & price | `NOT_STARTED` |

---

## PHASE 5 — Shopping Cart & Wishlist

| Task ID | Module | Task Title & Technical Details | Priority | Dependencies | Expected Files | Testing / Verification | Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `TASK-025` | Cart (`M07`) | Implement Guest (`X-Guest-Session-Id`) & User Cart CRUD, stock cap validation, and price-change warning detector | `P0` | `TASK-021` | `src/modules/carts/carts.service.ts`, `src/modules/carts/carts.controller.ts` | Price drift & stock limit integration tests | `NOT_STARTED` |
| `TASK-026` | Cart (`M07`) | Implement transactional Guest-to-User Cart Merge (`mergeGuestCart`) triggered on login/register | `P0` | `TASK-025` | `src/modules/carts/carts.service.ts` | `cart-merge.e2e-spec.ts` | `NOT_STARTED` |
| `TASK-027` | Wishlist (`M08`) | Implement Wishlist toggle, paginated list, and transactional `move-to-cart` endpoint | `P1` | `TASK-025` | `src/modules/wishlists/wishlists.service.ts` | Supertest `/api/v1/wishlist/*` | `NOT_STARTED` |
| `TASK-028` | Frontend Cart | Build Slide-Over Cart Drawer, Full Cart Page (with price/stock warning banners), and Wishlist Page | `P0` | `TASK-025`, `TASK-027` | `frontend/src/components/cart/CartDrawer.tsx`, `frontend/src/pages/wishlist/*` | UI updates cart badge & subtotal optimistically | `NOT_STARTED` |

---

## PHASE 6 — Checkout, Orders, Inventory & Vouchers

| Task ID | Module | Task Title & Technical Details | Priority | Dependencies | Expected Files | Testing / Verification | Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `TASK-029` | Inventory (`M12`) | Implement `InventoryService` with deterministic row locking (`ORDER BY variant_id ASC FOR UPDATE`), reserve, deduct, release & `inventory_transactions` ledger | `P0` | `TASK-021` | `src/modules/inventory/inventory.service.ts` | Unit & concurrency lock tests | `NOT_STARTED` |
| `TASK-030` | Vouchers (`M13`) | Implement Voucher & Promotion validation engine (`PERCENTAGE`, `FIXED_AMOUNT`, `FREE_SHIPPING`) and atomic usage counter | `P0` | `TASK-025` | `src/modules/promotions/vouchers.service.ts` | `checkout-pricing.spec.ts` | `NOT_STARTED` |
| `TASK-031` | Shipping (`M14`) | Implement Shipping Fee Calculator (`STANDARD`, `EXPRESS`, `SAME_DAY` + free shipping threshold) and `ShipmentsService` | `P0` | `TASK-017` | `src/modules/shipping/shipping.service.ts` | Shipping rule unit tests | `NOT_STARTED` |
| `TASK-032` | Checkout (`M09`) | Implement `/api/v1/checkout/preview` and ACID `/api/v1/checkout/place-order` with `Idempotency-Key` enforcement | `P0` | `TASK-029`, `TASK-030`, `TASK-031` | `src/modules/checkout/checkout.service.ts`, `src/modules/checkout/checkout.controller.ts` | `concurrent-checkout.e2e-spec.ts` & `checkout-idempotency.e2e-spec.ts` | `NOT_STARTED` |
| `TASK-033` | Orders (`M10`) | Implement Order State Machine, customer self-cancel (with stock & voucher release), and `order_status_history` timeline | `P0` | `TASK-032` | `src/modules/orders/orders.service.ts`, `src/modules/orders/order-state-machine.ts` | `order-state-machine.spec.ts` | `NOT_STARTED` |
| `TASK-034` | Frontend Checkout | Build React Checkout Page (Address, Shipping, Voucher, Payment selector) and Order Detail Timeline Page | `P0` | `TASK-032`, `TASK-033` | `frontend/src/pages/checkout/*`, `frontend/src/pages/account/orders/*` | End-to-end checkout & cancel verification | `NOT_STARTED` |

---

## PHASE 7 — Payment Integration

| Task ID | Module | Task Title & Technical Details | Priority | Dependencies | Expected Files | Testing / Verification | Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `TASK-035` | Payments (`M11`) | Implement Payment Gateway Adapters (VNPay / Stripe sandbox + COD) and signed redirect URL generator | `P0` | `TASK-032` | `src/modules/payments/payments.service.ts`, `src/modules/payments/providers/*` | Payment session generation test | `NOT_STARTED` |
| `TASK-036` | Webhooks (`M11`) | Implement HMAC-verified `/api/v1/payments/webhook/:provider` with `provider_transaction_id` idempotency and atomic stock deduction | `P0` | `TASK-035` | `src/modules/payments/payment-webhook.controller.ts` | `payment-webhook.e2e-spec.ts` | `NOT_STARTED` |
| `TASK-037` | Expiry & Refund | Implement 15-minute unpaid reservation expiration scheduler and Admin Refund workflow (`REFUNDED`) | `P1` | `TASK-036` | `src/modules/payments/reservation-expiry.service.ts` | Expired order releases `quantity_reserved` test | `NOT_STARTED` |

---

## PHASE 8 — Reviews, Notifications & Customer Support

| Task ID | Module | Task Title & Technical Details | Priority | Dependencies | Expected Files | Testing / Verification | Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `TASK-038` | Reviews (`M15`) | Implement Verified-Purchase Review creation (`DELIVERED` check), Cloudinary review photos, and atomic `rating_avg` recalculation | `P1` | `TASK-033` | `src/modules/reviews/reviews.service.ts` | Unverified buyer `403` test & rating avg math test | `NOT_STARTED` |
| `TASK-039` | Notifications (`M16`) | Implement event-driven In-App & Email Notification dispatcher and `notification_preferences` endpoints | `P1` | `TASK-033` | `src/modules/notifications/notifications.service.ts` | Notification creation on order status change | `NOT_STARTED` |
| `TASK-040` | Support (`M17`) | Implement Customer Support Tickets (`support_tickets`, `support_ticket_messages`) and AI escalation hook | `P1` | `TASK-016` | `src/modules/support/support.service.ts` | Ticket creation & reply thread tests | `NOT_STARTED` |
| `TASK-041` | Frontend Engagement | Build Product Review Modal, Header Notification Bell Drawer, and Support Tickets UI | `P1` | `TASK-038`, `TASK-039`, `TASK-040` | `frontend/src/components/reviews/*`, `frontend/src/components/notifications/*` | UI integration check | `NOT_STARTED` |

---

## PHASE 9 — Admin Dashboard & Analytics

| Task ID | Module | Task Title & Technical Details | Priority | Dependencies | Expected Files | Testing / Verification | Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `TASK-042` | Admin API (`M18`) | Implement Admin CRUD & operational endpoints for Catalog, Inventory adjustment, Orders/Shipments, Vouchers, Users, and `AuditLogService` | `P0` | `TASK-033`, `TASK-038` | `src/modules/admin/*`, `src/common/interceptors/audit-log.interceptor.ts` | Admin RBAC & `audit_logs` diff verification | `NOT_STARTED` |
| `TASK-043` | Analytics (`M19`) | Implement Sales/Revenue time-series, Top Products, Conversion breakdown, and AI usage cost analytics | `P1` | `TASK-042` | `src/modules/admin/analytics.service.ts` | Verify revenue excludes `CANCELLED`/`UNPAID` | `NOT_STARTED` |
| `TASK-044` | Frontend Admin | Build React Admin Operations Portal (`/admin/*`: Overview Charts, Product/Variant Editor, Inventory Ledger, Order Manager, Audit Viewer) | `P0` | `TASK-042`, `TASK-043` | `frontend/src/pages/admin/*` | Role-gated navigation & CRUD workflows | `NOT_STARTED` |

---

## PHASE 10 — AI Shopping Assistant

| Task ID | Module | Task Title & Technical Details | Priority | Dependencies | Expected Files | Testing / Verification | Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `TASK-045` | AI Core (`M20`) | Implement `AiOrchestratorService` with `@google/genai` function calling, conversation memory (`chat_sessions`, `chat_messages`), and timeout fallback | `P0` | `TASK-022`, `TASK-033`, `TASK-040` | `src/modules/ai-assistant/ai-orchestrator.service.ts` | Unit test with mocked & live Gemini tool calls | `NOT_STARTED` |
| `TASK-046` | AI Tools (`M20`) | Implement all 8 deterministic tools (`searchProducts`, `getProductDetails`, `compareProducts`, `checkInventoryAndPrice`, `getActivePromotions`, `getStorePolicies`, `getMyOrderStatus`, `createSupportEscalation`) | `P0` | `TASK-045` | `src/modules/ai-assistant/tools/tool-executor.service.ts` | `ai-tools.spec.ts` (including IDOR protection on `getMyOrderStatus`) | `NOT_STARTED` |
| `TASK-047` | AI Guardrails & Telemetry | Implement prompt-injection sanitizer, per-user rate limiter, daily cost circuit breaker, and `ai_usage_logs` recorder | `P0` | `TASK-046` | `src/modules/ai-assistant/ai-guardrails.service.ts` | Verify token/cost logging and injection rejection | `NOT_STARTED` |
| `TASK-048` | Frontend AI UI | Build `<AiShoppingAssistantDrawer />` with rich Product Cards ("Spin on Wheel" + "Add to Cart"), Comparison Matrix, Order Status Card, and Suggested Prompts | `P0` | `TASK-046`, `TASK-023` | `frontend/src/components/ai-chat/AiShoppingAssistantDrawer.tsx` | Interactive chat-to-wheel and chat-to-cart E2E flow | `NOT_STARTED` |

---

## PHASE 11 to 13 — Testing, Hardening & Production Deployment

| Task ID | Module | Task Title & Technical Details | Priority | Dependencies | Expected Files | Testing / Verification | Status |
| :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| `TASK-049` | QA (`M11`) | Complete Unit, Supertest Integration, and Concurrency race-condition test suites ($\ge 85\%$ domain coverage) | `P0` | `TASK-048` | `test/unit/*`, `test/integration/*` | `npm run test:cov` & `npm run test:e2e` pass | `NOT_STARTED` |
| `TASK-050` | E2E (`M11`) | Implement Playwright E2E test suite covering 360° Wheel, Catalog Search, Checkout, Admin, and AI Assistant | `P0` | `TASK-049` | `test/e2e/*`, `playwright.config.ts` | `npx playwright test` passes 100% | `NOT_STARTED` |
| `TASK-051` | Hardening (`M12`) | Tune PostgreSQL indexes (`EXPLAIN ANALYZE`), verify OWASP headers/CSP, rate limits, and Lighthouse accessibility | `P1` | `TASK-050` | `src/main.ts`, `prisma/migrations/*` | Zero high/critical security findings | `NOT_STARTED` |
| `TASK-052` | DevOps (`M13`) | Finalize `Dockerfile.backend`, `Dockerfile.frontend`, `docker-compose.yml`, and `.github/workflows/ci.yml` | `P1` | `TASK-051` | `docker-compose.yml`, `.github/workflows/ci.yml` | Full stack boots cleanly via `docker compose up` | `NOT_STARTED` |

