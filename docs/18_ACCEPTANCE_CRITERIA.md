# 18. ACCEPTANCE CRITERIA SPECIFICATION

> **Document ID:** `DOC-18`
> **Parent Document:** [PROJECT_MASTER_PLAN.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/PROJECT_MASTER_PLAN.md)
> **Version:** `1.0.0`

---

## 1. Master Acceptance Criteria Checklist (Given / When / Then)

### AC-AUTH: Authentication, Token Rotation & RBAC (`FR-AUTH-001` – `FR-AUTH-007`)
- **AC-AUTH-01 (Registration & Hashing):**
  - *Given* a new visitor submits valid registration details,
  - *When* `POST /api/v1/auth/register` completes,
  - *Then* a `users` row is created with a `bcrypt`/`argon2id` password hash (never plaintext or SHA-256), assigned the `CUSTOMER` role, and issued an Access + Refresh token pair.
- **AC-AUTH-02 (Refresh Token Reuse Detection):**
  - *Given* Refresh Token $T_1$ (in `family_id` $F$) has already been rotated to $T_2$,
  - *When* an attacker or stale client presents $T_1$ again at `POST /api/v1/auth/refresh`,
  - *Then* the server returns `401 TOKEN_REUSE_DETECTED`, immediately marks **all** tokens in family $F$ (including $T_2$) as `is_revoked = true`, and writes an entry to `audit_logs`.
- **AC-AUTH-03 (RBAC Guard Enforcement):**
  - *Given* a user authenticated with only the `CUSTOMER` role,
  - *When* they call `POST /api/v1/admin/products` or `POST /api/v1/admin/inventory/:id/adjust`,
  - *Then* the request is rejected with `403 INSUFFICIENT_PERMISSIONS` before reaching the controller method.

---

### AC-CAT: Catalog, 360° Rotating Wheel & Search (`FR-PROD-*`, `FR-VAR-*`, `FR-SRCH-*`)
- **AC-CAT-01 (Interactive 360° Rotating Wheel Showcase):**
  - *Given* a user opens the Storefront Home view in Light Mode (`#FFFFFF`),
  - *When* they click any orbiting product card, drag the wheel, scroll the mouse wheel, or press `ArrowLeft`/`ArrowRight`,
  - *Then* the wheel smoothly rotates the selected item to the active 9 o'clock position while keeping all product cards upright, and the Left Panel immediately renders the selected product's high-res Cloudinary image, price, discount badge, rating, stock count, variant selector, and "Add to Cart" CTA.
- **AC-CAT-02 (Variant Resolution & Decimal Price):**
  - *Given* a product with multiple variants (e.g., `Red Linear Switch` at `$169.00` with `10` in stock vs. `Tactile Brown Switch` at `$179.00` with `0` in stock),
  - *When* the customer selects `Tactile Brown Switch`,
  - *Then* the UI updates the displayed price to `$179.00`, shows `Out of Stock`, and disables the "Add to Cart" button for that variant.
- **AC-CAT-03 (Full-Text Search & Faceted Filtering):**
  - *Given* products across multiple categories and brands,
  - *When* `GET /api/v1/products?q=wireless&category=mechanical-keyboards&max_price=200&in_stock=true&sort=price_asc` is called,
  - *Then* only active products matching all criteria are returned sorted by ascending price in $\le 250\text{ms}$ ($p95$).

---

### AC-CART: Shopping Cart & Guest Merge (`FR-CART-001` – `FR-CART-005`)
- **AC-CART-01 (Guest-to-User Cart Merge):**
  - *Given* a Guest has 2 units of `SKU-01` in their guest cart (`X-Guest-Session-Id`) and their registered account already has 2 units of `SKU-01` in its user cart (with `available_stock = 3`),
  - *When* the user logs in with `X-Guest-Session-Id` attached,
  - *Then* the merged user cart contains `3` units of `SKU-01` (capped at `available_stock`), the guest cart is marked `MERGED`, and a stock-cap adjustment warning is returned.
- **AC-CART-02 (Price Change Warning):**
  - *Given* a customer added `SKU-02` to their cart when its price was `$99.00`, and an admin subsequently updated `SKU-02` price to `$89.00`,
  - *When* the customer opens their cart (`GET /api/v1/cart`),
  - *Then* the cart subtotal uses the authoritative `$89.00` price and `warnings[]` includes a `PRICE_CHANGED` notification (`$99.00 -> $89.00`).

---

### AC-CHK: Transactional Checkout, Inventory & Payment (`FR-CHK-*`, `FR-ORD-*`, `FR-PAY-*`, `FR-INV-*`)
- **AC-CHK-01 (Zero Overselling Under Concurrent Load):**
  - *Given* `SKU-LIMITED` has `quantity_on_hand = 1` and `quantity_reserved = 0`,
  - *When* 5 authenticated customers simultaneously submit `POST /api/v1/checkout/place-order` for 1 unit of `SKU-LIMITED`,
  - *Then* exactly 1 order succeeds (`201 Created`, `quantity_reserved = 1`) and 4 requests fail cleanly with `422 INSUFFICIENT_STOCK`.
- **AC-CHK-02 (Server-Side Price Authority & Snapshot Immutability):**
  - *Given* an order `ORD-001` is placed for `SKU-01` at `$120.00` with voucher `WELCOME10` (`-$12.00`),
  - *When* an admin later changes `SKU-01`'s catalog price to `$199.00` and renames the product,
  - *Then* `GET /api/v1/orders/ORD-001` still displays the original snapshot name, `$120.00` unit price, and `$12.00` discount without alteration.
- **AC-CHK-03 (Idempotent Webhook & Stock Deduction):**
  - *Given* an online-payment order `ORD-002` in `PENDING` / `UNPAID` state with 2 reserved units,
  - *When* the payment gateway sends a valid HMAC-signed webhook (`provider_transaction_id = 'TX_999'`) twice due to network retry,
  - *Then* the first webhook transitions `ORD-002` to `CONFIRMED` / `PAID` and decrements `quantity_on_hand` and `quantity_reserved` by 2, while the second webhook returns `200 OK` without deducting stock a second time.

---

### AC-AI: AI Shopping Assistant (`FR-AI-001` – `FR-AI-008`)
- **AC-AI-01 (Live SQL Price & Stock Grounding):**
  - *Given* a user asks the AI Shopping Assistant *"What is the exact price and stock of the Keychron Q1 Pro?"*,
  - *When* `/api/v1/ai/chat` processes the message,
  - *Then* the orchestrator invokes `getProductDetails` / `checkInventoryAndPrice`, quotes the exact `DECIMAL(15,2)` price and available stock from PostgreSQL, and returns an interactive `ProductCard` with "Spin on 360° Wheel" and "Add to Cart" actions.
- **AC-AI-02 (Cross-User Order Privacy / IDOR Prevention):**
  - *Given* Customer A (`user_a`) is logged in and asks the AI *"What is the status of order ORD-BELONGS-TO-USER-B?"*,
  - *When* the AI invokes `getMyOrderStatus`,
  - *Then* the server scopes the SQL query to `user_id = user_a.id`, finds no matching record, and responds that the order was not found under Customer A's account—never leaking Customer B's address, items, or status.
- **AC-AI-03 (LLM Provider Timeout Resilience):**
  - *Given* the external Gemini API times out or is unreachable,
  - *When* a user sends a chat message,
  - *Then* `/api/v1/ai/chat` responds within 8.5 seconds with a friendly fallback message and direct catalog search links without crashing or affecting checkout/catalog APIs.

