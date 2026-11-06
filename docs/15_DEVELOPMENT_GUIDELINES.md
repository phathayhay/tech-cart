# 15. DEVELOPMENT GUIDELINES & CODING STANDARDS

> **Document ID:** `DOC-15`
> **Parent Document:** [PROJECT_MASTER_PLAN.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/PROJECT_MASTER_PLAN.md)
> **Version:** `1.0.0`

---

## 1. Core Engineering Principles

1. **SOLID & Clean Modular Boundaries:**
   - **Single Responsibility:** Controllers only parse HTTP requests and return responses; Services own business rules and transactions; AI Tool Executors only bridge Gemini tool calls to Domain Services.
   - **Cross-Module Communication:** A module (e.g., `CheckoutModule`) must interact with another module (e.g., `InventoryModule` or `PromotionsModule`) through its exported NestJS Service interface—never by duplicating SQL logic.
2. **TypeScript Strict Mode (`strict: true`):**
   - `any` is prohibited unless explicitly justified at a third-party boundary.
   - All API request payloads, query params, and responses must have explicit TypeScript interfaces/DTOs.
3. **Monetary Arithmetic Discipline (`Decimal` Only):**
   - All monetary values fetched from Prisma are instances of `Prisma.Decimal`.
   - Use helper functions in `src/common/utils/money.util.ts` (`addMoney`, `subMoney`, `mulMoney`, `percentageOfMoney`, `formatMoney`) to guarantee consistent 2-decimal rounding across the entire codebase.
   - Never run `parseFloat(price) * qty` in financial calculation paths.

---

## 2. Naming & Code Organization Conventions

| Artifact Type | Convention | Example |
| :--- | :--- | :--- |
| **Database Tables & Columns** | `snake_case` (plural tables) | `product_variants`, `quantity_reserved` |
| **Prisma Models & Fields** | `PascalCase` models, `camelCase` fields mapped via `@map` / `@@map` | `model ProductVariant`, `quantityReserved` |
| **NestJS Files** | `kebab-case.<type>.ts` | `checkout.controller.ts`, `checkout.service.ts`, `place-order.dto.ts` |
| **React Components** | `PascalCase.tsx` | `ProductWheelShowcase.tsx`, `AiShoppingAssistantDrawer.tsx` |
| **Hooks & Stores** | `camelCase.ts` (`use*`) | `useWheelRotation.ts`, `useCartStore.ts` |
| **REST API URLs** | `kebab-case` plural resources | `/api/v1/products/wheel-showcase`, `/api/v1/orders/:orderCode/cancel` |
| **Requirement & Task IDs** | `UPPER-KEBAB-NUM` | `FR-CHK-002`, `NFR-PERF-001`, `TASK-024` |

---

## 3. Centralized Error Handling Standard

Never throw raw `Error('Something went wrong')` or return ad-hoc JSON error shapes from controllers.
- Use typed domain exceptions extending `DomainException` (`InsufficientStockException`, `InvalidVoucherException`, `IllegalOrderStateException`, `TokenReuseCompromiseException`).
- A single global `AllExceptionsFilter` catches `DomainException`, `HttpException`, `PrismaClientKnownRequestError` (mapping `P2002` unique violation to `409 CONFLICT` and `P2025` to `404 NOT_FOUND`), and formats them into the standard error envelope defined in [08_API_SPECIFICATION.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/08_API_SPECIFICATION.md).

---

## 4. Git Workflow & Commit Message Standard

Follow **Conventional Commits**:
- `feat(checkout): implement row-locked stock reservation and voucher allocation (TASK-038)`
- `fix(auth): revoke entire token family on refresh token reuse detection (TASK-015)`
- `docs(db): update 05_DATABASE_DESIGN.md with review_images index`
- `test(orders): add concurrent flash-sale checkout race condition test (TASK-068)`

### Pre-Commit Verification Checklist
Before marking any task `COMPLETED`:
1. `npx tsc --noEmit` passes with `0` errors.
2. `npm run lint` passes with `0` errors.
3. Unit and integration tests for the touched module pass (`npm test`).
4. Relevant documentation (`docs/17_TASK_BACKLOG.md`, `docs/20_CHANGELOG.md`, and API/DB docs if changed) is updated.

