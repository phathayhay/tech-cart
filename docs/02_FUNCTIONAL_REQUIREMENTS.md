# 02. FUNCTIONAL REQUIREMENTS SPECIFICATION (FRS)

> **Document ID:** `DOC-02`
> **Parent Document:** [PROJECT_MASTER_PLAN.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/PROJECT_MASTER_PLAN.md)
> **Version:** `1.0.0`

---

## Module Overview Index

The platform is decomposed into **20 cohesive functional modules**:

1. [M01: Authentication & Authorization (`FR-AUTH-*`)](#m01-authentication--authorization)
2. [M02: User Management (`FR-USER-*`)](#m02-user-management)
3. [M03: Product Management (`FR-PROD-*`)](#m03-product-management)
4. [M04: Category Management (`FR-CAT-*`)](#m04-category-management)
5. [M05: Product Variants (`FR-VAR-*`)](#m05-product-variants)
6. [M06: Product Search & Filtering (`FR-SRCH-*`)](#m06-product-search--filtering)
7. [M07: Shopping Cart (`FR-CART-*`)](#m07-shopping-cart)
8. [M08: Wishlist (`FR-WISH-*`)](#m08-wishlist)
9. [M09: Checkout (`FR-CHK-*`)](#m09-checkout)
10. [M10: Order Management (`FR-ORD-*`)](#m10-order-management)
11. [M11: Payment Management (`FR-PAY-*`)](#m11-payment-management)
12. [M12: Inventory Management (`FR-INV-*`)](#m12-inventory-management)
13. [M13: Promotion & Voucher (`FR-PRM-*`)](#m13-promotion--voucher)
14. [M14: Shipping & Delivery (`FR-SHIP-*`)](#m14-shipping--delivery)
15. [M15: Review & Rating (`FR-REV-*`)](#m15-review--rating)
16. [M16: Notification (`FR-NOTI-*`)](#m16-notification)
17. [M17: Customer Support (`FR-SUP-*`)](#m17-customer-support)
18. [M18: Admin Dashboard (`FR-ADM-*`)](#m18-admin-dashboard)
19. [M19: Analytics & Reporting (`FR-ANL-*`)](#m19-analytics--reporting)
20. [M20: AI Shopping Assistant (`FR-AI-*`)](#m20-ai-shopping-assistant)

---

## M01: Authentication & Authorization

- **Objectives:** Securely register, authenticate, and authorize users using JWT Access/Refresh token rotation and Role-Based Access Control (RBAC).
- **Actors:** `GUEST`, `CUSTOMER`, `SUPPORT_AGENT`, `INVENTORY_MANAGER`, `SUPER_ADMIN`.
- **Functional Requirements:**
  - `FR-AUTH-001`: Register account with email, password, full name, and phone number; dispatch email verification token.
  - `FR-AUTH-002`: Authenticate via email/password; issue short-lived Access Token (15m) and rotating Refresh Token (7d).
  - `FR-AUTH-003`: Rotate Refresh Token on `/auth/refresh`; detect token reuse and revoke entire token family on compromise.
  - `FR-AUTH-004`: Logout current session or all active sessions by revoking refresh tokens.
  - `FR-AUTH-005`: Verify email via token and support resending verification emails with rate limiting.
  - `FR-AUTH-006`: Forgot password & reset password using single-use expiring token (15m TTL).
  - `FR-AUTH-007`: Enforce RBAC route guards via role and granular permission decorators (`@Permissions('products.write')`).
- **Main Workflow:** User submits credentials $\rightarrow$ DTO validation $\rightarrow$ Argon2id/Bcrypt password verification $\rightarrow$ Check `account_status` $\rightarrow$ Generate JWT pair $\rightarrow$ Persist hashed refresh token in `refresh_tokens` $\rightarrow$ Merge guest cart if `X-Guest-Session-Id` present.
- **Business Rules:** Passwords require $\ge 8$ chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char. Lock account for 15m after 5 consecutive failed logins.
- **Input / Output:** Input: `RegisterDto`, `LoginDto`, `RefreshTokenDto`. Output: `{ access_token, refresh_token, user }`.
- **Validation & Error Scenarios:** `400` Validation failed; `401` Invalid credentials / expired token; `403` Account suspended / insufficient role; `409` Email already registered; `429` Too many login attempts.
- **Dependencies:** `M02 User Management`, `M07 Shopping Cart`, `M16 Notification`.
- **API & DB Requirements:** `/api/v1/auth/*`; tables: `users`, `roles`, `permissions`, `user_roles`, `refresh_tokens`, `audit_logs`.
- **Acceptance Criteria:** Rotating a refresh token invalidates the old token immediately; reusing an old token revokes all tokens for that user.

---

## M02: User Management

- **Objectives:** Manage customer profiles, avatars, multiple shipping addresses, password changes, and admin user lifecycle.
- **Actors:** `CUSTOMER`, `SUPER_ADMIN`.
- **Functional Requirements:**
  - `FR-USER-001`: View and update personal profile (`full_name`, `username`, `phone`, `date_of_birth`, `bio`, `avatar_url`).
  - `FR-USER-002`: Upload/crop avatar image via Sharp + Cloudinary pipeline.
  - `FR-USER-003`: Change password while authenticated (requires current password verification and revokes other sessions).
  - `FR-USER-004`: CRUD shipping addresses (`user_addresses`) with `is_default` toggle (at most one default address per user).
  - `FR-USER-005`: Admin list, search, filter, suspend/reactivate user accounts, and assign roles.
- **Main Workflow:** User updates address and sets `is_default = true` $\rightarrow$ Transaction unsets previous default address for `user_id` and marks new address as default.
- **Business Rules:** Deleting an address used in past orders does not affect historical orders (orders store address snapshots). Maximum 10 saved addresses per user.
- **Input / Output:** `UpdateProfileDto`, `CreateAddressDto`, `ChangePasswordDto`. Output: `UserProfileResponseDto`.
- **Error Scenarios:** `400` Invalid phone/postal format; `401` Current password mismatch; `404` Address not found.
- **Dependencies:** `M01 Auth`, Cloudinary Media service.
- **API & DB Requirements:** `/api/v1/users/me`, `/api/v1/users/me/addresses`, `/api/v1/admin/users`; tables: `users`, `user_addresses`, `user_roles`.
- **Acceptance Criteria:** Setting a new default address guarantees exactly one row in `user_addresses` has `is_default = true` for that user.

---

## M03: Product Management

- **Objectives:** Manage core product catalog entries, rich specifications, SEO slugs, Cloudinary image galleries, and lifecycle states (`DRAFT`, `ACTIVE`, `ARCHIVED`).
- **Actors:** `GUEST`, `CUSTOMER`, `INVENTORY_MANAGER`, `SUPER_ADMIN`.
- **Functional Requirements:**
  - `FR-PROD-001`: Create/update product with `name`, unique `slug`, `sku_prefix`, `brand`, `category_id`, `base_price`, `compare_at_price`, `short_description`, `description`, `specifications` (structured JSON), and `is_featured_on_wheel`.
  - `FR-PROD-002`: Upload, reorder, and delete multiple product images (`product_images`) with `alt_text` and `is_primary` flag on Cloudinary.
  - `FR-PROD-003`: Retrieve public product list (including 360° Wheel featured subset) and detailed product view by `id` or `slug`.
  - `FR-PROD-004`: Soft-archive products (`status = 'ARCHIVED'`) so historical order links remain intact while hiding them from public purchase.
  - `FR-PROD-005`: Provide related/recommended products based on category, brand, and price band.
- **Business Rules:** `base_price` must be `DECIMAL(15,2) > 0`. If `compare_at_price` is set, it must be $\ge \text{base\_price}$. Deleting a product with existing orders is forbidden (must archive instead).
- **Input / Output:** `CreateProductDto`, `UpdateProductDto`. Output: `ProductDetailDto` with images, variants, and rating summary.
- **Error Scenarios:** `400` Price `< 0` or `compare_at_price < base_price`; `404` Product not found; `409` Duplicate slug or SKU.
- **Dependencies:** `M04 Category`, `M05 Product Variants`, `M12 Inventory`.
- **API & DB Requirements:** `/api/v1/products`, `/api/v1/admin/products`; tables: `products`, `product_images`.
- **Acceptance Criteria:** Product creation with images stores optimized Cloudinary HTTPS URLs and exact `DECIMAL(15,2)` prices.

---

## M04: Category Management

- **Objectives:** Organize products into a hierarchical category tree (`parent_id`) with SEO slugs, icons, and display ordering.
- **Actors:** `GUEST`, `CUSTOMER`, `INVENTORY_MANAGER`, `SUPER_ADMIN`.
- **Functional Requirements:**
  - `FR-CAT-001`: CRUD categories with `name`, `slug`, `description`, `image_url`, `parent_id`, `sort_order`, and `is_active`.
  - `FR-CAT-002`: Fetch nested category tree (up to 3 levels deep) with active product counts per category.
  - `FR-CAT-003`: Prevent circular parent references (`A -> B -> A`) and prevent deleting categories that contain active products or child categories.
- **Input / Output:** `CreateCategoryDto`, `CategoryTreeDto`.
- **Error Scenarios:** `400` Circular hierarchy detected; `409` Category slug exists or category has linked products.
- **Dependencies:** `M03 Product Management`.
- **API & DB Requirements:** `/api/v1/categories`, `/api/v1/admin/categories`; table: `categories`.
- **Acceptance Criteria:** Filtering by a parent category returns products belonging to both the parent category and its active subcategories.

---

## M05: Product Variants

- **Objectives:** Support multi-attribute product variations (e.g., Color, Switch Type, Storage, Connectivity) with independent SKUs, price overrides, and stock tracking.
- **Actors:** `GUEST`, `CUSTOMER`, `INVENTORY_MANAGER`, `SUPER_ADMIN`.
- **Functional Requirements:**
  - `FR-VAR-001`: Define reusable product attributes (`product_attributes`, e.g., `Switch Type`, `Color`) and values (`product_attribute_values`, e.g., `Tactile Brown`, `Linear Red`, `Matte White`).
  - `FR-VAR-002`: Create product variants (`product_variants`) with unique `sku`, `price`, `compare_at_price`, `weight_grams`, `image_url`, and mapped attribute value combinations.
  - `FR-VAR-003`: Enforce uniqueness of attribute value combinations per product (cannot have two `Matte White + Linear Red` variants for the same keyboard).
  - `FR-VAR-004`: Default every simple product to have at least one default active variant (`is_default = true`) so Cart, Inventory, and Order items uniformly reference `variant_id`.
- **Business Rules:** Every purchasable unit in the system is represented by a `product_variant` linked 1-to-1 with an `inventory` record.
- **Error Scenarios:** `409` Duplicate SKU or duplicate attribute combination for product.
- **Dependencies:** `M03 Product Management`, `M12 Inventory Management`.
- **API & DB Requirements:** `/api/v1/products/:id/variants`, `/api/v1/admin/variants`; tables: `product_variants`, `product_attributes`, `product_attribute_values`, `variant_attribute_values`.
- **Acceptance Criteria:** Selecting attribute options on the PDP resolves the exact `variant_id`, live price, variant image, and available stock count.

---

## M06: Product Search & Filtering

- **Objectives:** Enable fast, accurate full-text search, multi-faceted filtering, sorting, and pagination across the catalog.
- **Actors:** `GUEST`, `CUSTOMER`, `AI_ASSISTANT`.
- **Functional Requirements:**
  - `FR-SRCH-001`: Full-text search across product `name`, `brand`, `short_description`, `sku`, and category name using PostgreSQL `tsvector` + `GIN` index and trigram (`pg_trgm`) fuzzy matching.
  - `FR-SRCH-002`: Filter by `category_slug` (including children), `brand[]`, `min_price`, `max_price`, `min_rating`, `in_stock_only`, `has_discount`, and dynamic attribute filters (e.g., `attr[color]=white`).
  - `FR-SRCH-003`: Sort results by `relevance`, `price_asc`, `price_desc`, `newest`, `best_selling`, and `rating_desc`.
  - `FR-SRCH-004`: Return paginated results (`page`, `limit`, `total_items`, `total_pages`) plus available facet counts (`brands`, `price_range`).
  - `FR-SRCH-005`: Provide lightweight autocomplete suggestions (`/api/v1/products/suggestions?q=`) returning top 5 matching products and categories in $< 150\text{ms}$.
- **Error Scenarios:** `400` `min_price > max_price` or `limit > 100`.
- **Dependencies:** `M03 Product`, `M04 Category`, `M05 Variants`, `M12 Inventory`.
- **API & DB Requirements:** `GET /api/v1/products`; GIN index on `search_vector`.
- **Acceptance Criteria:** Combined search + category + price + stock filter returns accurate paginated items and facet counts without N+1 queries.

---

## M07: Shopping Cart

- **Objectives:** Manage persistent shopping carts for both guest sessions (`session_id`) and authenticated users (`user_id`), validating stock and price dynamically.
- **Actors:** `GUEST`, `CUSTOMER`.
- **Functional Requirements:**
  - `FR-CART-001`: Add `variant_id` with `quantity` ($\ge 1$) to cart; increment quantity if variant already exists in cart.
  - `FR-CART-002`: Update item quantity (`quantity = 0` removes item) or remove individual item / clear cart.
  - `FR-CART-003`: Validate requested quantity against current available stock ($\text{on\_hand} - \text{reserved}$) and per-order limit (`max_per_order`, default 10).
  - `FR-CART-004`: Detect catalog price changes or out-of-stock status since item was added (`unit_price_at_add` vs. current live `variant.price`) and return structured `warnings[]` to the UI.
  - `FR-CART-005`: Automatically merge guest cart (`session_id`) into user cart (`user_id`) upon login or registration, capping merged quantities at available stock.
- **Business Rules:** Cart totals are always computed dynamically from current live `product_variants.price`.
- **Input / Output:** `AddToCartDto { variant_id, quantity }`, `UpdateCartItemDto { quantity }`. Output: `CartSummaryDto` with items, live prices, stock flags, subtotal, and price-change warnings.
- **Error Scenarios:** `400` Invalid quantity; `404` Variant not found or inactive; `422` Requested quantity exceeds available stock.
- **Dependencies:** `M05 Product Variants`, `M12 Inventory`.
- **API & DB Requirements:** `/api/v1/cart`, `/api/v1/cart/items`, `/api/v1/cart/merge`; tables: `carts`, `cart_items`.
- **Acceptance Criteria:** Merging a guest cart containing 2 units with a user cart containing 3 units of the same SKU results in 5 units (or `available_stock` if $< 5$) and deletes/marks the guest cart merged.

---

## M08: Wishlist

- **Objectives:** Allow authenticated customers to save favorite products/variants for later purchase and move them directly to the shopping cart.
- **Actors:** `CUSTOMER`.
- **Functional Requirements:**
  - `FR-WISH-001`: Toggle (add/remove) a product/variant in the user's wishlist (`wishlist_items`).
  - `FR-WISH-002`: List paginated wishlist items with live price, discount badge, and stock availability status.
  - `FR-WISH-003`: Move a wishlist item directly into the active shopping cart (`POST /api/v1/wishlist/items/:id/move-to-cart`).
- **Business Rules:** Unique constraint on `(wishlist_id, product_id, variant_id)`.
- **Dependencies:** `M03 Product`, `M05 Variants`, `M07 Cart`.
- **API & DB Requirements:** `/api/v1/wishlist`; tables: `wishlists`, `wishlist_items`.
- **Acceptance Criteria:** Moving an item from wishlist to cart adds 1 unit to the cart and removes the item from the wishlist in a single transaction.

---

## M09: Checkout

- **Objectives:** Orchestrate a tamper-proof, atomic checkout process that validates cart items, recalculates all financial totals on the server, applies vouchers, reserves inventory, and initiates payment.
- **Actors:** `CUSTOMER`.
- **Functional Requirements:**
  - `FR-CHK-001`: Preview checkout summary (`POST /api/v1/checkout/preview`) calculating `subtotal`, `voucher_discount`, `shipping_fee`, `tax_amount`, and `grand_total` from server data.
  - `FR-CHK-002`: Place order (`POST /api/v1/checkout/place-order`) requiring an `Idempotency-Key` header to prevent duplicate orders on double-click or network retry.
  - `FR-CHK-003`: Lock and reserve inventory (`SELECT ... FOR UPDATE`) for all cart items inside a serializable/read-committed row-locked DB transaction.
  - `FR-CHK-004`: Validate and record voucher usage (`voucher_usages`) atomically inside the same transaction.
  - `FR-CHK-005`: Snapshot immutable product/variant names, SKUs, unit prices, and shipping address into `orders` and `order_items`.
- **Main Workflow:** Receive `PlaceOrderDto` + `Idempotency-Key` $\rightarrow$ Check idempotency key $\rightarrow$ Lock cart & inventory rows in deterministic `variant_id` order $\rightarrow$ Verify stock $\ge$ qty $\rightarrow$ Recalculate subtotal, voucher discount, shipping, tax $\rightarrow$ Insert `orders`, `order_items`, `order_status_history` $\rightarrow$ Update `inventory.quantity_reserved` & insert `inventory_transactions` $\rightarrow$ Insert `payments` $\rightarrow$ Clear purchased items from `cart_items` $\rightarrow$ Commit transaction $\rightarrow$ Return order & payment redirect URL.
- **Error Scenarios:** `400` Empty cart / invalid voucher; `409` Duplicate idempotency conflict in progress; `422` Insufficient stock for one or more items (returns specific SKU shortage details).
- **Dependencies:** `M07 Cart`, `M10 Orders`, `M11 Payment`, `M12 Inventory`, `M13 Voucher`, `M14 Shipping`.
- **API & DB Requirements:** `/api/v1/checkout/preview`, `/api/v1/checkout/place-order`.
- **Acceptance Criteria:** Two concurrent checkout requests for the last 1 unit of a SKU result in exactly 1 succeeded order and 1 `422 INSUFFICIENT_STOCK` response.

---

## M10: Order Management

- **Objectives:** Track the complete order lifecycle from creation through fulfillment, delivery, cancellation, or return/refund with an immutable audit trail.
- **Actors:** `CUSTOMER`, `SUPPORT_AGENT`, `INVENTORY_MANAGER`, `SUPER_ADMIN`, `AI_ASSISTANT` (read-only for owner).
- **Functional Requirements:**
  - `FR-ORD-001`: Generate human-readable unique `order_code` (e.g., `ORD-20261106-8F3A2C`).
  - `FR-ORD-002`: Customer views paginated order history Filterable by status and views full order detail including item snapshots, payment state, shipment tracking, and status timeline (`order_status_history`).
  - `FR-ORD-003`: Customer self-cancels order when status is `PENDING` or `CONFIRMED` with a cancellation reason, automatically releasing reserved stock.
  - `FR-ORD-004`: Enforce strict state machine transitions (`PENDING` $\rightarrow$ `CONFIRMED` $\rightarrow$ `PROCESSING` $\rightarrow$ `SHIPPED` $\rightarrow$ `DELIVERED` $\rightarrow$ `COMPLETED`, or `CANCELLED` / `RETURN_REQUESTED` / `REFUNDED`).
  - `FR-ORD-005`: Generate downloadable invoice/receipt data for completed orders.
- **Business Rules:** Illegal state transitions (e.g., `DELIVERED` $\rightarrow$ `PENDING`) are rejected with `422 UNPROCESSABLE_ENTITY`. Every status change appends an immutable row to `order_status_history` with `changed_by` and `note`.
- **Dependencies:** `M11 Payment`, `M12 Inventory`, `M14 Shipping`, `M16 Notification`.
- **API & DB Requirements:** `/api/v1/orders`, `/api/v1/orders/:orderCode`, `/api/v1/orders/:orderCode/cancel`, `/api/v1/admin/orders`; tables: `orders`, `order_items`, `order_status_history`.
- **Acceptance Criteria:** Cancelling an unpaid `PENDING` order transitions status to `CANCELLED`, restores `quantity_reserved`, and logs the transition in `order_status_history`.

---

## M11: Payment Management

- **Objectives:** Process online payments (VNPay / Stripe / MoMo) and COD securely, verify webhook signatures, enforce idempotency, handle timeouts, and process refunds.
- **Actors:** `CUSTOMER`, `PAYMENT_GATEWAY_WEBHOOK`, `SUPER_ADMIN`.
- **Functional Requirements:**
  - `FR-PAY-001`: Create payment session / signed redirect URL for online payment methods (`VNPAY`, `STRIPE`, `MOMO`) or register `COD` payment record.
  - `FR-PAY-002`: Receive and verify asynchronous payment webhooks using cryptographic HMAC-SHA256/SHA512 signature verification (`POST /api/v1/payments/webhook/:provider`).
  - `FR-PAY-003`: Enforce webhook idempotency using unique `provider_transaction_id` in `payment_transactions` so duplicate gateway callbacks are safely ignored.
  - `FR-PAY-004`: Verify that the paid amount reported by the gateway matches `orders.grand_total` before marking payment `PAID` and deducting reserved inventory.
  - `FR-PAY-005`: Background/scheduled expiration job cancels online-payment orders that remain `UNPAID` past the 15-minute reservation window and releases reserved stock.
  - `FR-PAY-006`: Admin initiates full or partial refund (`REFUNDED`), recording a `REFUND` ledger entry in `payment_transactions`.
- **Business Rules:** Frontend redirects (`/checkout/return`) are informational only; order payment status is mutated **only** by verified server-to-server webhook callbacks or authenticated admin COD collection confirmation.
- **Dependencies:** `M09 Checkout`, `M10 Order`, `M12 Inventory`.
- **API & DB Requirements:** `/api/v1/payments/*`; tables: `payments`, `payment_transactions`.
- **Acceptance Criteria:** Replaying the same valid payment webhook 5 times results in only 1 state transition and 1 stock deduction.

---

## M12: Inventory Management

- **Objectives:** Maintain accurate real-time stock quantities (`on_hand`, `reserved`), prevent negative inventory, log every stock movement, and alert admins on low stock.
- **Actors:** `INVENTORY_MANAGER`, `SUPER_ADMIN`, `SYSTEM`.
- **Functional Requirements:**
  - `FR-INV-001`: Track `quantity_on_hand`, `quantity_reserved`, and `low_stock_threshold` per `variant_id`.
  - `FR-INV-002`: Record an immutable `inventory_transactions` ledger entry (`RESTOCK`, `RESERVE`, `RELEASE`, `SALE_DEDUCT`, `RETURN_RESTOCK`, `MANUAL_ADJUSTMENT`) for every stock change with `reference_type`, `reference_id`, `quantity_change`, `balance_after`, and `actor_id`.
  - `FR-INV-003`: Admin manual stock restock or adjustment with mandatory audit reason.
  - `FR-INV-004`: Low-stock alert feed when $(\text{quantity\_on\_hand} - \text{quantity\_reserved}) \le \text{low\_stock\_threshold}$.
- **Business Rules:** Database `CHECK` constraints enforce `quantity_on_hand >= 0`, `quantity_reserved >= 0`, and `quantity_on_hand >= quantity_reserved`.
- **Dependencies:** `M05 Product Variants`, `M09 Checkout`, `M10 Orders`.
- **API & DB Requirements:** `/api/v1/admin/inventory`, `/api/v1/admin/inventory/:variantId/adjust`; tables: `inventory`, `inventory_transactions`.
- **Acceptance Criteria:** Every change to `inventory` has a corresponding row in `inventory_transactions` whose sum matches the current state.

---

## M13: Promotion & Voucher

- **Objectives:** Manage promotional campaigns and discount vouchers with flexible rules, validity windows, and atomic usage caps.
- **Actors:** `CUSTOMER`, `SUPER_ADMIN`.
- **Functional Requirements:**
  - `FR-PRM-001`: Admin creates vouchers with `code` (uppercase normalized), `discount_type` (`PERCENTAGE`, `FIXED_AMOUNT`, `FREE_SHIPPING`), `discount_value`, `max_discount_amount`, `min_order_Subtotal`, `start_at`, `end_at`, `usage_limit_total`, `usage_limit_per_user`, and `is_active`.
  - `FR-PRM-002`: Customer validates voucher code against their current cart (`POST /api/v1/vouchers/validate`) and sees exact calculated savings or a clear rejection reason.
  - `FR-PRM-003`: Configure automatic catalog-level flash promotions (`promotions`) scoped to specific categories or products.
  - `FR-PRM-004`: Release voucher usage count if an order using that voucher is cancelled before payment/fulfillment.
- **Business Rules:** Computed voucher discount can never exceed `order.subtotal` (for item vouchers) or `order.shipping_fee` (for `FREE_SHIPPING` vouchers).
- **Dependencies:** `M07 Cart`, `M09 Checkout`.
- **API & DB Requirements:** `/api/v1/vouchers/validate`, `/api/v1/admin/vouchers`; tables: `vouchers`, `voucher_usages`, `promotions`.
- **Acceptance Criteria:** A voucher with `usage_limit_per_user = 1` cannot be used a second time by the same user on an active/completed order.

---

## M14: Shipping & Delivery

- **Objectives:** Calculate shipping fees by delivery method/zone and track package shipments from dispatch to delivery.
- **Actors:** `CUSTOMER`, `INVENTORY_MANAGER`, `SUPER_ADMIN`.
- **Functional Requirements:**
  - `FR-SHIP-001`: Support multiple shipping methods (`STANDARD`, `EXPRESS`, `SAME_DAY`) with base fee rules and free-shipping threshold (e.g., free standard shipping on orders $\ge \$100.00$).
  - `FR-SHIP-002`: Create shipment record (`shipments`) when order moves to `SHIPPED`, capturing `carrier_name`, `tracking_number`, `tracking_url`, `estimated_delivery_at`, and `shipped_at`.
  - `FR-SHIP-003`: Update delivery status (`IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `DELIVERY_FAILED`) and synchronize parent order status.
- **Dependencies:** `M09 Checkout`, `M10 Order Management`, `M16 Notification`.
- **API & DB Requirements:** `/api/v1/shipping/methods`, `/api/v1/admin/orders/:orderCode/shipments`; table: `shipments`.
- **Acceptance Criteria:** Marking a shipment `DELIVERED` sets `orders.status = 'DELIVERED'`, records `delivered_at`, and notifies the customer.

---

## M15: Review & Rating

- **Objectives:** Collect authentic verified-purchase product reviews with star ratings and photos, and maintain accurate aggregate product ratings.
- **Actors:** `GUEST`, `CUSTOMER`, `SUPER_ADMIN`.
- **Functional Requirements:**
  - `FR-REV-001`: Verified buyer submits a review (`rating` $1\text{–}5$ integer, `title`, `comment`, and up to 4 Cloudinary `review_images`) for a delivered order item.
  - `FR-REV-002`: Automatically recalculate `products.rating_avg` (`DECIMAL(3,2)`) and `products.rating_count` whenever a review is created, updated, or moderated.
  - `FR-REV-003`: Publicly list reviews for a product with pagination, rating distribution breakdown ($5\star \dots 1\star$), and filter by rating or `with_media`.
  - `FR-REV-004`: Admin moderation (`APPROVED`, `HIDDEN`, `FLAGGED`) and official seller reply (`admin_reply`).
- **Business Rules:** Users who have not purchased and received (`DELIVERED`) the product receive `403 FORBIDDEN` when attempting to post a review.
- **Dependencies:** `M03 Product`, `M10 Order Management`.
- **API & DB Requirements:** `/api/v1/products/:id/reviews`, `/api/v1/admin/reviews`; tables: `reviews`, `review_images`.
- **Acceptance Criteria:** Submitting a new $5\star$ review updates the product's `rating_avg` and `rating_count` atomically.

---

## M16: Notification

- **Objectives:** Deliver timely in-app and email notifications for critical account, order, payment, shipment, and promotion events, respecting user preferences.
- **Actors:** `CUSTOMER`, `ADMIN`, `SYSTEM`.
- **Functional Requirements:**
  - `FR-NOTI-001`: Trigger notifications on key domain events (`ORDER_PLACED`, `PAYMENT_CONFIRMED`, `ORDER_SHIPPED`, `ORDER_DELIVERED`, `ORDER_CANCELLED`, `PASSWORD_CHANGED`, `LOW_STOCK_ALERT`).
  - `FR-NOTI-002`: User views paginated in-app notifications with unread badge count, marks single/all notifications as read.
  - `FR-NOTI-003`: User manages `notification_preferences` (opt-in/out of marketing emails vs. transactional updates; transactional security/order emails remain mandatory).
- **Dependencies:** `M01 Auth`, `M10 Orders`, `M11 Payments`, `M14 Shipping`.
- **API & DB Requirements:** `/api/v1/notifications`, `/api/v1/notifications/preferences`; tables: `notifications`, `notification_preferences`.
- **Acceptance Criteria:** Transitioning an order to `SHIPPED` creates an unread in-app notification for the buyer with a deep link to the order detail view.

---

## M17: Customer Support

- **Objectives:** Provide structured customer support ticketing and seamless human escalation from the AI Shopping Assistant.
- **Actors:** `CUSTOMER`, `SUPPORT_AGENT`, `SUPER_ADMIN`, `AI_ASSISTANT`.
- **Functional Requirements:**
  - `FR-SUP-001`: Customer creates a support ticket (`support_tickets`) linked optionally to an `order_id` or `chat_session_id`, with `category` (`ORDER_ISSUE`, `PAYMENT`, `WARRANTY`, `PRODUCT_INQUIRY`, `OTHER`), `priority`, and `subject`.
  - `FR-SUP-002`: Threaded ticket replies (`support_ticket_messages`) between customer and support agent.
  - `FR-SUP-003`: AI Shopping Assistant can invoke `createSupportEscalation` tool when a user requests a human agent or has a complex dispute, automatically attaching the AI conversation summary.
- **Dependencies:** `M10 Orders`, `M20 AI Shopping Assistant`.
- **API & DB Requirements:** `/api/v1/support/tickets`, `/api/v1/admin/support/tickets`; tables: `support_tickets`, `support_ticket_messages`.
- **Acceptance Criteria:** Escalating an AI chat session creates a `support_tickets` record in `OPEN` status with `chat_session_id` linked.

---

## M18: Admin Dashboard

- **Objectives:** Provide a centralized, role-protected operational portal for managing all store entities, monitoring system health, and reviewing audit logs.
- **Actors:** `SUPPORT_AGENT`, `INVENTORY_MANAGER`, `SUPER_ADMIN`.
- **Functional Requirements:**
  - `FR-ADM-001`: Unified Admin Overview KPI cards (Today's Revenue, Pending Orders, Low-Stock SKUs, Open Support Tickets, AI Token Spend).
  - `FR-ADM-002`: Full management tables with search, filter, sort, and bulk actions for Products, Categories, Variants, Inventory, Orders, Payments, Vouchers, Reviews, and Users.
  - `FR-ADM-003`: Immutable `audit_logs` viewer tracking every administrative write action (`actor_id`, `action`, `entity_type`, `entity_id`, `before_state`, `after_state`, `ip_address`).
  - `FR-ADM-004`: AI Configuration panel to manage store policy documents (`store_policies`), FAQs, daily AI token budgets, and view flagged AI conversations.
- **Dependencies:** All backend modules (`M01`–`M20`).
- **API & DB Requirements:** `/api/v1/admin/*`; table: `audit_logs`.
- **Acceptance Criteria:** Any admin price change or stock adjustment writes a structured diff entry to `audit_logs`.

---

## M19: Analytics & Reporting

- **Objectives:** Deliver actionable financial, sales, funnel, inventory, and AI assistant performance analytics.
- **Actors:** `SUPER_ADMIN`, `INVENTORY_MANAGER`.
- **Functional Requirements:**
  - `FR-ANL-001`: Revenue & Order time-series aggregation (`daily`, `weekly`, `monthly`) showing Gross Revenue, Discounts, Net Revenue, Order Count, and Average Order Value (AOV).
  - `FR-ANL-002`: Top-selling products and categories by units sold and revenue.
  - `FR-ANL-003`: Conversion & Order Status breakdown (`PENDING`, `COMPLETED`, `CANCELLED`, `REFUNDED`).
  - `FR-ANL-004`: AI Assistant Effectiveness & Cost metrics (total sessions, tool calls executed, AI-assisted cart additions, escalation rate, total input/output tokens, estimated USD cost).
- **Dependencies:** `M10 Orders`, `M11 Payments`, `M20 AI Assistant`.
- **API & DB Requirements:** `/api/v1/admin/analytics/sales`, `/api/v1/admin/analytics/products`, `/api/v1/admin/analytics/ai`.
- **Acceptance Criteria:** Revenue reports include only `PAID` / `COMPLETED` orders and exclude `CANCELLED` or `UNPAID` orders.

---

## M20: AI Shopping Assistant

- **Objectives:** Provide an intelligent, conversational AI Shopping Assistant powered by Google Gemini Function/Tool Calling that helps users discover products, compare specifications, check live stock/prices, understand policies, and track orders without hallucination.
- **Actors:** `GUEST`, `CUSTOMER`, `SUPER_ADMIN`.
- **Functional Requirements:**
  - `FR-AI-001`: Manage multi-turn chat sessions (`chat_sessions`) and message history (`chat_messages`) for both guests and authenticated users.
  - `FR-AI-002`: Execute deterministic backend **Tool Calls** (`searchProducts`, `getProductDetails`, `compareProducts`, `checkInventoryAndPrice`, `getActivePromotions`, `getStorePolicies`, `getMyOrderStatus`, `createSupportEscalation`).
  - `FR-AI-003`: Return structured UI payloads alongside natural-language responses (`product_cards[]`, `comparison_table`, `voucher_badges[]`, `order_card`, `suggested_prompts[]`) so the frontend renders rich interactive cards (including "View on 360° Wheel" and "Add to Cart" actions).
  - `FR-AI-004`: Enforce strict data isolation on `getMyOrderStatus`: the tool receives `user_id` from the verified server-side JWT context (never from LLM arguments) and refuses access to other users' orders.
  - `FR-AI-005`: Ground all policy/FAQ answers (`shipping`, `returns`, `warranty`, `payment methods`) using approved records in `store_policies` and `product_faqs`.
  - `FR-AI-006`: Log every LLM invocation in `ai_usage_logs` (`model_name`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `latency_ms`, `tools_called`, `estimated_cost_usd`, `status`).
  - `FR-AI-007`: Protect against prompt injection, off-topic abuse, and cost exhaustion via input sanitization, system prompt boundaries, and per-user/per-IP rate limits.
  - `FR-AI-008`: Provide graceful fallback response with direct catalog search links if the external LLM provider times out or returns an error.
- **Dependencies:** `M03 Product`, `M06 Search`, `M10 Order`, `M12 Inventory`, `M13 Voucher`, `M17 Support`.
- **API & DB Requirements:** `POST /api/v1/ai/chat`, `GET /api/v1/ai/sessions`, `GET /api/v1/ai/sessions/:id`; tables: `chat_sessions`, `chat_messages`, `ai_usage_logs`, `store_policies`.
- **Acceptance Criteria:** Asking the AI *"Compare the top 2 wireless keyboards under $150 that are in stock"* triggers `searchProducts` and `compareProducts`, returning exact prices and stock counts matching PostgreSQL records.

