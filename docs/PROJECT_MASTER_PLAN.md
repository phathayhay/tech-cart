# PROJECT MASTER PLAN: AI-POWERED E-COMMERCE PLATFORM (TECHCART PRO)

> **Document Status:** `APPROVED FOR PHASE 0 REVIEW`
> **Version:** `1.0.0`
> **Last Updated:** `2026-11-06`
> **Execution Rule:** **Documentation-First & Phase-Gated.** No implementation code for Phase 1+ may be written until Phase 0 documentation is reviewed and approved.

---

## 1. Executive Summary

**TechCart Pro** is a production-oriented, full-stack E-Commerce Platform featuring an interactive **360° Rotating Product Showcase**, comprehensive **Catalog, Cart, Checkout, Order, Payment, Inventory, Promotion, Review, and Admin Operations**, and a **Grounded AI Shopping Assistant** powered by **Google Gemini Function/Tool Calling**.

This Master Plan serves as the **single source of truth and central navigation hub** for all architectural, business, database, API, security, AI, QA, and project management specifications.

---

## 2. Master Documentation Index

All project specifications are organized in the `docs/` directory and must be kept synchronized whenever requirements, schemas, or APIs evolve:

| Doc ID | Document File | Primary Domain | Purpose & Key Contents |
| :--- | :--- | :--- | :--- |
| **MASTER** | [PROJECT_MASTER_PLAN.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/PROJECT_MASTER_PLAN.md) | Project Governance | Main navigation hub, phase gates, architecture overview, and execution tracker |
| **DOC-00** | [00_PROJECT_OVERVIEW.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/00_PROJECT_OVERVIEW.md) | Baseline Audit & Vision | Current repository audit (`Express` + `pg` + Vanilla SPA) vs. Target Architecture (`NestJS` + `Prisma` + `React/Vite` + `Gemini AI`) |
| **DOC-01** | [01_BUSINESS_REQUIREMENTS.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/01_BUSINESS_REQUIREMENTS.md) | Business Analysis | Business goals, KPIs, target personas, stakeholders, workflows, rules, scope vs. out-of-scope |
| **DOC-02** | [02_FUNCTIONAL_REQUIREMENTS.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/02_FUNCTIONAL_REQUIREMENTS.md) | Functional Specs | Detailed specs for all **20 Functional Modules** (`FR-AUTH-001` through `FR-AI-008`) |
| **DOC-03** | [03_NON_FUNCTIONAL_REQUIREMENTS.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/03_NON_FUNCTIONAL_REQUIREMENTS.md) | Quality Attributes | Measurable SLAs for Performance, Scalability, Security, Reliability, Accessibility, Consistency |
| **DOC-04** | [04_SYSTEM_ARCHITECTURE.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/04_SYSTEM_ARCHITECTURE.md) | System Architecture | Modular Monolith architecture, Frontend/Backend/DB/Cloudinary/AI boundaries, migration strategy |
| **DOC-05** | [05_DATABASE_DESIGN.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/05_DATABASE_DESIGN.md) | Database Engineering | 34-table normalized PostgreSQL design, `DECIMAL(15,2)` money rules, concurrency, complete `schema.prisma` |
| **DOC-06** | [06_DATABASE_RELATIONSHIPS.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/06_DATABASE_RELATIONSHIPS.md) | Data Integrity & ERD | Complete Mermaid `erDiagram`, Foreign Keys, `ON DELETE` rules, transaction & locking boundaries |
| **DOC-07** | [07_BUSINESS_LOGIC.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/07_BUSINESS_LOGIC.md) | Domain Workflows | Cart merge, Server-side Checkout math, Idempotent Payments, Inventory reservation (`FOR UPDATE`), Order state machine |
| **DOC-08** | [08_API_SPECIFICATION.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/08_API_SPECIFICATION.md) | API Contracts | RESTful `/api/v1/*` endpoints, DTO schemas, query pagination/filtering, error codes |
| **DOC-09** | [09_AUTHENTICATION_AUTHORIZATION.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/09_AUTHENTICATION_AUTHORIZATION.md) | IAM & RBAC | JWT Access/Refresh rotation, reuse detection, Argon2id/Bcrypt password upgrade, RBAC permission matrix |
| **DOC-10** | [10_AI_SHOPPING_ASSISTANT.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/10_AI_SHOPPING_ASSISTANT.md) | AI Engineering | Gemini Tool-Calling orchestration, SQL real-time grounding vs. Policy RAG, anti-hallucination, cost controls, KPIs |
| **DOC-11** | [11_UI_UX_SPECIFICATION.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/11_UI_UX_SPECIFICATION.md) | Frontend & Design | UI/UX Pro Max Light Mode tokens, 360° Rotating Wheel Showcase, Customer/Admin screens, AI Chat drawer |
| **DOC-12** | [12_SECURITY_REQUIREMENTS.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/12_SECURITY_REQUIREMENTS.md) | Application Security | OWASP controls, CSRF/CORS/CSP, rate limiting, Cloudinary validation, webhook HMAC verification, audit trail |
| **DOC-13** | [13_TESTING_STRATEGY.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/13_TESTING_STRATEGY.md) | Quality Assurance | Test pyramid (Jest Unit, Supertest Integration with Test DB, Playwright E2E), coverage gates |
| **DOC-14** | [14_DEPLOYMENT_GUIDE.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/14_DEPLOYMENT_GUIDE.md) | DevOps & Infra | Multi-stage Dockerfiles, `docker-compose.yml`, environment validation, GitHub Actions CI/CD |
| **DOC-15** | [15_DEVELOPMENT_GUIDELINES.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/15_DEVELOPMENT_GUIDELINES.md) | Engineering Standards | TypeScript strict mode, SOLID/Clean Architecture, NestJS module layout, Git & PR conventions |
| **DOC-16** | [16_PROJECT_ROADMAP.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/16_PROJECT_ROADMAP.md) | Delivery Phases | End-to-end execution roadmap across **Phases 0 to 13** with prerequisites and Definitions of Done |
| **DOC-17** | [17_TASK_BACKLOG.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/17_TASK_BACKLOG.md) | Task Tracking | Granular engineering backlog (`TASK-001` to `TASK-085`) with priorities (`P0`–`P3`), dependencies, and statuses |
| **DOC-18** | [18_ACCEPTANCE_CRITERIA.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/18_ACCEPTANCE_CRITERIA.md) | Release Verification | Testable Given/When/Then acceptance criteria mapped to `FR-*` and `NFR-*` IDs |
| **DOC-19** | [19_RISK_REGISTER.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/19_RISK_REGISTER.md) | Risk Management | Technical, financial, concurrency, AI, and migration risks with mitigation playbooks |
| **DOC-20** | [20_CHANGELOG.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/20_CHANGELOG.md) | Version History | Complete chronological record of repository milestones from initial prototype to Phase 0 Master Plan |

---

## 3. Target Technology Stack Summary

| Layer | Technology | Rationale & Architectural Constraints |
| :--- | :--- | :--- |
| **Language** | TypeScript `^5.9` (Strict Mode) | End-to-end type safety across Backend, ORM, and Frontend |
| **Backend Framework** | **NestJS** (RESTful Modular Monolith) | Dependency Injection, modular boundaries, `class-validator`/`zod` DTO pipes, centralized exception filters, Guard-based RBAC |
| **Database & ORM** | **PostgreSQL 16+** + **Prisma ORM** (`Prisma Migrate`) | ACID transactions, row-level locking (`SELECT ... FOR UPDATE`), `DECIMAL(15,2)` monetary precision, native PostgreSQL Full-Text Search (`tsvector`) |
| **Media Storage** | **Cloudinary** + **Sharp** | Memory-buffered image compression (`Sharp`) streamed directly to Cloudinary (`shopping_cart_be`); zero local disk bloat |
| **Frontend Framework** | **React 19 + Vite** (or Next.js App Router) + **TypeScript** | Fast SPA/SSR delivery, **Tailwind CSS**, **shadcn/ui**, **Zustand** (client cart/UI/wheel state), **TanStack Query** (server cache), **React Hook Form + Zod** |
| **AI Integration** | **Google Gemini API** (`@google/genai`) | Controlled **Function/Tool Calling** against live PostgreSQL services + Policy/FAQ RAG over `store_policies` & `product_faqs` tables |
| **Testing Suite** | **Jest** + **Supertest** + **Playwright** | Unit tests for business logic, integration tests for API + DB transactions, E2E tests for customer checkout & AI assistant |
| **DevOps** | **Docker** + **Docker Compose** + **GitHub Actions** | Reproducible local and production environments without unnecessary infrastructure (no Redis, Vector DB, or Kafka in Phase 1) |

---

## 4. Phase Execution & Governance Tracker

| Phase | Phase Name | Primary Deliverables | Status | Gate Condition |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 0** | Discovery, Analysis & Documentation | Complete `docs/` suite (`00`–`20` + `PROJECT_MASTER_PLAN.md`) | `COMPLETED` | User reviews and approves Phase 0 |
| **Phase 1** | Foundation & Project Setup | Monorepo/Workspace structure (`src/main.ts` NestJS + `frontend/` React/Vite), ESLint/Prettier, Docker Compose, Env validation | `COMPLETED` | Phase 0 Approved |
| **Phase 2** | Database Design & Prisma Setup | `prisma/schema.prisma` (38 tables), initial migration, seed script (roles, categories, variants, policies in VND) | `COMPLETED` | Phase 1 Complete |
| **Phase 3** | Auth, Users & RBAC | Argon2id/Bcrypt hashing, JWT Access/Refresh rotation, RBAC Guards, Addresses, Profile & Cloudinary Avatar | `COMPLETED` | Phase 2 Complete |
| **Phase 4** | Product Catalog, Categories & Variants | Category tree, Products, Variants/SKUs, Attributes, Cloudinary Gallery, Postgres FTS search & filtering | `NOT_STARTED` | Phase 3 Complete |
| **Phase 5** | Cart & Wishlist | Guest + Auth Cart merge, real-time stock/price validation, Wishlist CRUD & move-to-cart | `NOT_STARTED` | Phase 4 Complete |
| **Phase 6** | Checkout, Orders, Inventory & Vouchers | ACID Checkout, `SELECT ... FOR UPDATE` inventory reservation, Voucher engine, Order state machine | `NOT_STARTED` | Phase 5 Complete |
| **Phase 7** | Payment Integration | VNPay/Stripe/MoMo & COD adapters, idempotency keys, HMAC webhook reconciliation, refunds | `NOT_STARTED` | Phase 6 Complete |
| **Phase 8** | Reviews, Notifications & Support | Verified-purchase reviews, rating aggregation, in-app/email notifications, support tickets | `NOT_STARTED` | Phase 7 Complete |
| **Phase 9** | Admin Dashboard & Analytics | Admin RBAC views for Catalog, Inventory, Orders, Vouchers, Users, Revenue/Conversion analytics | `NOT_STARTED` | Phase 8 Complete |
| **Phase 10** | AI Shopping Assistant | Gemini Tool-Calling service, 8 deterministic tools, prompt-injection guardrails, AI chat UI widget & cost logs | `NOT_STARTED` | Phase 9 Complete |
| **Phase 11** | Testing & Quality Assurance | Unit (`>80%` domain coverage), Supertest API integration suite, Playwright E2E checkout & AI flows | `NOT_STARTED` | Phase 10 Complete |
| **Phase 12** | Performance, Security & Hardening | Rate limiting, Helmet/CSP, query index tuning (`EXPLAIN ANALYZE`), security audit | `NOT_STARTED` | Phase 11 Complete |
| **Phase 13** | Deployment & Production Readiness | Production Docker Compose, CI/CD workflow, backup/restore scripts, operational runbook | `NOT_STARTED` | Phase 12 Complete |

---

## 5. Golden Engineering Rules

1. **Documentation First:** Never implement or alter a database table, API endpoint, or business rule without updating the corresponding document in `docs/` first.
2. **Never Trust the Client for Money or Stock:** All item prices, discounts, shipping fees, taxes, and stock checks are recalculated inside a server-side PostgreSQL transaction at checkout.
3. **Zero Floating-Point Money:** All monetary columns in PostgreSQL use `DECIMAL(15, 2)` and are handled in TypeScript using `Prisma.Decimal` or integer minor units.
4. **Grounded AI Only:** The AI Shopping Assistant must **never** guess product prices, stock levels, or order statuses. Every factual claim must originate from a verified backend tool call (`searchProducts`, `getProductDetails`, `checkInventory`, `getOrderStatus`, `getStorePolicies`).
5. **Keep Infrastructure Lean:** Use a clean **Modular Monolith** with PostgreSQL. Do not add Redis, Elasticsearch, Vector Databases, or message queues unless a documented NFR threshold is exceeded.

