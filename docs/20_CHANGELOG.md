# 20. PROJECT CHANGELOG

> **Document ID:** `DOC-20`
> **Parent Document:** [PROJECT_MASTER_PLAN.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/PROJECT_MASTER_PLAN.md)
> **Version:** `1.0.0`

---

## [1.2.0-phase2] — 2026-11-06 (Phase 2: Database Design & Prisma Setup)

### Added
- Created authoritative 38-table normalized PostgreSQL schema in [prisma/schema.prisma](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/prisma/schema.prisma) using `UUID` primary keys, `DECIMAL(15, 2)` monetary fields, and `VND` default currency (`TASK-010`).
- Implemented global [PrismaService](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/src/prisma/prisma.service.ts) and [PrismaModule](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/src/prisma/prisma.module.ts) wired into `AppModule`.
- Generated SQL migration in [prisma/migrations/20261106_init_ecommerce_platform/migration.sql](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/prisma/migrations/20261106_init_ecommerce_platform/migration.sql) and custom PostgreSQL `CHECK` constraints + `GIN` Full-Text Search index in [database/constraints_and_fts.sql](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/database/constraints_and_fts.sql) (`TASK-011`).
- Implemented idempotent database seed script in [prisma/seed.ts](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/prisma/seed.ts) (`TASK-012`) seeding:
  - 4 Roles (`CUSTOMER`, `SUPPORT_AGENT`, `INVENTORY_MANAGER`, `SUPER_ADMIN`) & 22 granular permissions.
  - 4 Default verified accounts (`admin@techcart.com`, `inventory@techcart.com`, `support@techcart.com`, `customer@techcart.com` — password: `Password123!`).
  - 6 Categories, 8 Flagship Products (6 featured on the 360° Rotating Wheel Showcase), 16 SKU Variants with attributes (`Màu sắc`, `Loại Switch`), and `inventory` + `inventory_transactions` ledger in VND (`₫`).
  - 3 Active Vouchers (`WELCOME10`, `TECHSAVE500K`, `FREESHIP`) and 5 Official Store Policies (`store_policies`) in Vietnamese for the AI Shopping Assistant.
- Added integration test [test/integration/prisma-schema.spec.ts](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/test/integration/prisma-schema.spec.ts) verifying VND Decimal precision and DB-level `chk_inventory_non_negative` overselling protection.

---

## [1.1.0-phase1] — 2026-11-06 (Phase 1: Foundation & Project Setup)

### Added
- Locked in business decisions across `docs/`: Default currency **VND (`₫`)**, Payment Gateway **VNPay Sandbox + COD**, and Monorepo workspace layout (`frontend/` + `public/` reference).
- Bootstrapped **NestJS Modular Monolith** in [src/main.ts](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/src/main.ts) and [src/app.module.ts](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/src/app.module.ts) with Swagger OpenAPI (`/api/v1/docs`), Helmet CSP, CORS, and `@nestjs/throttler`.
- Implemented Zod startup environment validation in [src/config/env.validation.ts](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/src/config/env.validation.ts).
- Implemented `Decimal` monetary arithmetic & pro-rata discount allocation utilities for VND in [src/common/utils/money.util.ts](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/src/common/utils/money.util.ts) with unit tests in [test/unit/money.util.spec.ts](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/test/unit/money.util.spec.ts).
- Implemented centralized exception handling ([src/common/filters/all-exceptions.filter.ts](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/src/common/filters/all-exceptions.filter.ts)) and `X-Request-Id` response envelope interceptor ([src/common/interceptors/request-id.interceptor.ts](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/src/common/interceptors/request-id.interceptor.ts)).
- Implemented [HealthController](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/src/modules/health/health.controller.ts) (`GET /api/v1/health`) probing live PostgreSQL latency and Cloudinary status.
- Scaffolded React 19 + Vite + TypeScript + Tailwind + Zustand + TanStack Query frontend in `frontend/` and created [.env.example](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/.env.example) and [docker-compose.yml](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docker-compose.yml).

---

## [1.0.0-phase0] — 2026-11-06 (Phase 0: Master Architecture & Documentation Suite)

### Added
- Created complete 22-document engineering specification under `docs/`:
  - [PROJECT_MASTER_PLAN.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/PROJECT_MASTER_PLAN.md): Central navigation hub, stack governance, and phase gate tracker.
  - [00_PROJECT_OVERVIEW.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/00_PROJECT_OVERVIEW.md): Technical audit of current repository vs. target production architecture.
  - [01_BUSINESS_REQUIREMENTS.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/01_BUSINESS_REQUIREMENTS.md): Business KPIs, personas, workflows, core invariants (`BR-01`–`BR-07`), and scope boundaries.
  - [02_FUNCTIONAL_REQUIREMENTS.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/02_FUNCTIONAL_REQUIREMENTS.md): Complete functional specifications for all 20 modules (`M01`–`M20`, `FR-AUTH-001` through `FR-AI-008`).
  - [03_NON_FUNCTIONAL_REQUIREMENTS.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/03_NON_FUNCTIONAL_REQUIREMENTS.md): Measurable SLAs and test conditions for latency, concurrency, security, and accessibility.
  - [04_SYSTEM_ARCHITECTURE.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/04_SYSTEM_ARCHITECTURE.md): Modular Monolith architecture (`NestJS` + `Prisma` + `PostgreSQL 16` + `Cloudinary` + `React/Vite` + `Gemini Tool Calling`) and ADR trade-off records.
  - [05_DATABASE_DESIGN.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/05_DATABASE_DESIGN.md): 38-table normalized PostgreSQL design, `DECIMAL(15,2)` monetary standard, and complete `prisma/schema.prisma`.
  - [06_DATABASE_RELATIONSHIPS.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/06_DATABASE_RELATIONSHIPS.md): Full Mermaid `erDiagram`, Foreign Key `ON DELETE` rules, and deadlock-free row locking (`ORDER BY variant_id ASC FOR UPDATE`).
  - [07_BUSINESS_LOGIC.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/07_BUSINESS_LOGIC.md): Guest-to-User cart merge sequence, server-side checkout pricing formulas, pro-rata voucher allocation, payment webhook sequence, and Order State Machine.
  - [08_API_SPECIFICATION.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/08_API_SPECIFICATION.md): RESTful `/api/v1/*` endpoint catalog, response envelopes, and status codes.
  - [09_AUTHENTICATION_AUTHORIZATION.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/09_AUTHENTICATION_AUTHORIZATION.md): Argon2id/Bcrypt password upgrade path, Refresh Token rotation & reuse detection, and RBAC permission matrix.
  - [10_AI_SHOPPING_ASSISTANT.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/10_AI_SHOPPING_ASSISTANT.md): Gemini Tool-Calling architecture, 8 deterministic tools, SQL vs. Policy RAG grounding rules, prompt-injection defense, and KPI/A-B evaluation plan.
  - [11_UI_UX_SPECIFICATION.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/11_UI_UX_SPECIFICATION.md): UI/UX Pro Max Light Mode tokens, Split-Screen 360° Rotating Product Wheel Showcase, Customer/Admin views, and AI Assistant Drawer cards.
  - [12_SECURITY_REQUIREMENTS.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/12_SECURITY_REQUIREMENTS.md) through [19_RISK_REGISTER.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/19_RISK_REGISTER.md): Security controls, Testing Pyramid, Docker/CI-CD Guide, Coding Guidelines, 13-Phase Roadmap, 52-Task Backlog, Acceptance Criteria, and Risk Register.

---

## [0.4.0] — 2026-11-06 (Frontend Modularization & Live Credential Verification)

### Changed
- Refactored monolithic frontend files (`public/index.html`, `public/style.css`, `public/app.js`) into clean modular architecture:
  - HTML View Partials: `public/views/auth.html`, `public/views/store.html`, `public/views/dashboard.html`.
  - CSS Modules: `public/css/variables.css`, `public/css/components.css`, `public/css/store-wheel.css`, `public/css/cart.css`, `public/css/auth.css`, `public/css/dashboard.css`.
  - ES Modules: `public/js/state.js`, `public/js/api.js`, `public/js/ui.js`, `public/js/store-wheel.js`, `public/js/cart.js`, `public/js/auth.js`, `public/js/dashboard.js`, `public/js/router.js`.
- Verified live connectivity to PostgreSQL (`shopping_cart_be` on `localhost:5432`) and Cloudinary (`dnpim8h29`).

---

## [0.3.0] — 2026-11-06 (PostgreSQL Migration & Cloudinary Integration)

### Added
- Migrated persistence layer from MongoDB to PostgreSQL (`pg.Pool`) with initial `database/schema.sql` and automatic database/table initialization in [src/services/database.services.ts](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/src/services/database.services.ts).
- Integrated Cloudinary cloud media storage in [src/utils/cloudinary.ts](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/src/utils/cloudinary.ts) and [src/services/medias.services.ts](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/src/services/medias.services.ts) using `sharp` memory buffers; purged local temporary uploads.

---

## [0.2.0] — 2026-11-06 (UI/UX Pro Max White Theme & 360° Rotating Wheel Showcase)

### Added
- Installed `ui-ux-pro-max` design skill (`.agent/skills/ui-ux-pro-max/SKILL.md`).
- Redesigned storefront to Pure White Light Mode (`#FFFFFF` / `#F8FAFC`) with a split-screen layout:
  - Right side: Interactive 360° Rotating Product Wheel (`#wheel-stage`) supporting click, drag-to-spin, scroll wheel, and keyboard arrows.
  - Left side: Dynamic active product showcase with large image, specs, discount badge, quantity selector, and Add to Cart CTA.

