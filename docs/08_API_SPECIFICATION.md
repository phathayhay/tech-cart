# 08. API SPECIFICATION

> **Document ID:** `DOC-08`
> **Parent Document:** [PROJECT_MASTER_PLAN.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/PROJECT_MASTER_PLAN.md)
> **Version:** `1.0.0`

---

## 1. Global API Conventions

- **Base URL Prefix:** `/api/v1`
- **OpenAPI / Swagger UI:** Served at `/api/v1/docs` in development/staging environments.
- **Content-Type:** `application/json` (except `multipart/form-data` for `/api/v1/media/*`).
- **Authentication Header:** `Authorization: Bearer <access_token>`
- **Guest Session Header:** `X-Guest-Session-Id: <uuid-v4>` (used by Cart and AI Chat for unauthenticated visitors).
- **Idempotency Header:** `Idempotency-Key: <uuid-v4>` (required on `POST /api/v1/checkout/place-order`).

### 1.1 Standard Success Response Envelope

```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 12,
    "total_items": 48,
    "total_pages": 4
  },
  "request_id": "req_01J9Z8K2M3N4P5Q6R7"
}
```

### 1.2 Standard Error Response Envelope

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Requested quantity exceeds available stock for Keychron Q1 Pro (Red Linear)",
    "status_code": 422,
    "details": [
      {
        "field": "items[0].quantity",
        "variant_id": "8e3b9f12-4c21-4a91-b811-2a3b4c5d6e7f",
        "requested": 5,
        "available": 2
      }
    ]
  },
  "request_id": "req_01J9Z8K2M3N4P5Q6R7",
  "timestamp": "2026-11-06T09:30:00.000Z"
}
```

### 1.3 Standard HTTP Status Codes

| Status Code | Error Code Examples | Meaning |
| :--- | :--- | :--- |
| `200 OK` | — | Synchronous read, update, or action succeeded |
| `201 Created` | — | Resource created (`Register`, `PlaceOrder`, `CreateProduct`, `CreateReview`) |
| `400 Bad Request` | `VALIDATION_ERROR`, `INVALID_VOUCHER` | Malformed input DTO or violated request parameter |
| `401 Unauthorized` | `TOKEN_EXPIRED`, `INVALID_CREDENTIALS`, `TOKEN_REUSE_DETECTED` | Missing, expired, or revoked authentication credentials |
| `403 Forbidden` | `INSUFFICIENT_PERMISSIONS`, `UNVERIFIED_PURCHASE` | Authenticated user lacks required role/permission or business ownership |
| `404 Not Found` | `RESOURCE_NOT_FOUND` | Target entity does not exist or is archived |
| `409 Conflict` | `DUPLICATE_EMAIL`, `DUPLICATE_SKU`, `IDEMPOTENCY_CONFLICT` | Uniqueness constraint violation or concurrent duplicate request |
| `422 Unprocessable Entity` | `INSUFFICIENT_STOCK`, `ILLEGAL_ORDER_TRANSITION` | Syntactically valid request violates a domain business rule |
| `429 Too Many Requests` | `RATE_LIMIT_EXCEEDED`, `AI_QUOTA_EXCEEDED` | Throttling threshold reached |
| `500 Internal Server Error` | `INTERNAL_ERROR` | Unhandled server exception (stack trace hidden in production) |

---

## 2. Complete Endpoint Catalog by Module

### 2.1 Authentication & Users (`/api/v1/auth`, `/api/v1/users`)

| Method | Endpoint | Auth / Permission | Request DTO / Query | Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | `{ email, password, full_name, phone? }` | `201` `{ access_token, refresh_token, user }` |
| `POST` | `/api/v1/auth/login` | Public | `{ email, password }` + `X-Guest-Session-Id?` | `200` `{ access_token, refresh_token, user, cart_merged }` |
| `GET` | `/api/v1/auth/google/url` | Public | `?redirect_uri=` | `200` `{ auth_url, client_id, configured }` |
| `GET` | `/api/v1/auth/google/callback` | Public | `?code=&state=` | `302 / 200` Exchanges Google OAuth code & redirects with tokens |
| `POST` | `/api/v1/auth/google` | Public | `{ id_token?, code?, redirect_uri? }` | `200` `{ access_token, refresh_token, is_new_user, account_linked, user }` |
| `POST` | `/api/v1/auth/refresh` | Public | `{ refresh_token }` | `200` `{ access_token, refresh_token }` (Rotated) |
| `POST` | `/api/v1/auth/logout` | `Bearer` | `{ refresh_token, all_devices?: boolean }` | `200` `{ revoked: true }` |
| `POST` | `/api/v1/auth/verify-email` | Public | `{ token }` | `200` `{ verified: true }` |
| `POST` | `/api/v1/auth/forgot-password` | Public | `{ email }` | `200` Generic success message (prevents enumeration) |
| `POST` | `/api/v1/auth/reset-password` | Public | `{ token, new_password }` | `200` Password updated & sessions revoked |
| `GET` | `/api/v1/users/me` | `Bearer` | — | `200` Full profile + roles + default address |
| `PATCH` | `/api/v1/users/me` | `Bearer` | `{ full_name?, username?, phone?, date_of_birth?, bio?, avatar_url? }` | `200` Updated profile |
| `POST` | `/api/v1/users/me/change-password` | `Bearer` | `{ current_password, new_password }` | `200` Password changed |
| `GET` | `/api/v1/users/me/addresses` | `Bearer` | — | `200` List of saved `UserAddress[]` |
| `POST` | `/api/v1/users/me/addresses` | `Bearer` | `CreateAddressDto` | `201` Created address |
| `PATCH` | `/api/v1/users/me/addresses/:id` | `Bearer` | `UpdateAddressDto` | `200` Updated address |
| `DELETE` | `/api/v1/users/me/addresses/:id` | `Bearer` | — | `200` Deleted address |

### 2.2 Categories, Products & Search (`/api/v1/categories`, `/api/v1/products`)

| Method | Endpoint | Auth / Permission | Request Query / Body | Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/categories` | Public | `?include_counts=true` | `200` Hierarchical category tree |
| `GET` | `/api/v1/products` | Public | `?q=&category=&brand=&min_price=&max_price=&min_rating=&in_stock=&featured_wheel=&sort=&page=1&limit=12` | `200` Paginated products + facet counts |
| `GET` | `/api/v1/products/wheel-showcase` | Public | — | `200` Ordered list of flagship products for the 360° Rotating Wheel |
| `GET` | `/api/v1/products/suggestions` | Public | `?q=key` | `200` Top 5 autocomplete matches |
| `GET` | `/api/v1/products/:idOrSlug` | Public | — | `200` Full product detail, gallery, attributes, variants, live stock, rating distribution |
| `GET` | `/api/v1/products/:id/related` | Public | `?limit=4` | `200` Related products list |
| `GET` | `/api/v1/products/:id/reviews` | Public | `?rating=&with_media=&page=1&limit=10` | `200` Paginated product reviews |

### 2.3 Cart & Wishlist (`/api/v1/cart`, `/api/v1/wishlist`)

| Method | Endpoint | Auth / Permission | Request Body | Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/cart` | Optional `Bearer` or `X-Guest-Session-Id` | — | `200` Cart items, live prices, available stock, subtotal, `warnings[]` |
| `POST` | `/api/v1/cart/items` | Optional `Bearer` or `X-Guest-Session-Id` | `{ variant_id, quantity }` | `200` Updated `CartSummaryDto` |
| `PATCH` | `/api/v1/cart/items/:variantId` | Optional `Bearer` or `X-Guest-Session-Id` | `{ quantity }` (`0` removes item) | `200` Updated `CartSummaryDto` |
| `DELETE` | `/api/v1/cart/items/:variantId` | Optional `Bearer` or `X-Guest-Session-Id` | — | `200` Updated `CartSummaryDto` |
| `DELETE` | `/api/v1/cart` | Optional `Bearer` or `X-Guest-Session-Id` | — | `200` Empty `CartSummaryDto` |
| `POST` | `/api/v1/cart/merge` | `Bearer` | `{ guest_session_id }` | `200` Merged `CartSummaryDto` |
| `GET` | `/api/v1/wishlist` | `Bearer` | `?page=1&limit=20` | `200` Paginated wishlist items |
| `POST` | `/api/v1/wishlist/toggle` | `Bearer` | `{ product_id, variant_id? }` | `200` `{ added: boolean }` |
| `POST` | `/api/v1/wishlist/items/:id/move-to-cart` | `Bearer` | — | `200` Item moved to cart |

### 2.4 Vouchers, Checkout, Orders & Payments (`/api/v1/vouchers`, `/api/v1/checkout`, `/api/v1/orders`, `/api/v1/payments`)

| Method | Endpoint | Auth / Permission | Request Body / Headers | Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/vouchers/active` | Public | — | `200` Publicly claimable active vouchers |
| `POST` | `/api/v1/vouchers/validate` | `Bearer` | `{ code, cart_subtotal }` | `200` `{ valid, discount_amount, message }` |
| `POST` | `/api/v1/checkout/preview` | `Bearer` | `{ address_id?, shipping_method, voucher_code? }` | `200` Exact server-calculated breakdown (`subtotal`, `discount`, `shipping`, `tax`, `grand_total`) |
| `POST` | `/api/v1/checkout/place-order` | `Bearer` + `Idempotency-Key` | `{ address_id \| shipping_address, shipping_method, payment_method, voucher_code?, customer_note? }` | `201` `{ order_code, status, grand_total, payment_url? }` |
| `GET` | `/api/v1/orders` | `Bearer` | `?status=&page=1&limit=10` | `200` Customer's paginated orders |
| `GET` | `/api/v1/orders/:orderCode` | `Bearer` | — | `200` Full order detail + `items` + `status_history` + `shipments` |
| `POST` | `/api/v1/orders/:orderCode/cancel` | `Bearer` | `{ reason }` | `200` Order cancelled & stock released |
| `POST` | `/api/v1/payments/webhook/:provider` | Public (HMAC Verified) | Gateway webhook payload + HMAC headers | `200` Idempotent webhook acknowledgment |

### 2.5 Reviews, Notifications, Support & Media

| Method | Endpoint | Auth / Permission | Request Body | Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/reviews` | `Bearer` (Verified Buyer) | `{ order_id, product_id, rating, title?, comment, image_urls? }` | `201` Created review + updated product rating |
| `GET` | `/api/v1/notifications` | `Bearer` | `?unread_only=false&page=1&limit=20` | `200` Notifications + `unread_count` |
| `PATCH` | `/api/v1/notifications/:id/read` | `Bearer` | — | `200` Marked read |
| `POST` | `/api/v1/notifications/read-all` | `Bearer` | — | `200` All marked read |
| `POST` | `/api/v1/support/tickets` | `Bearer` | `{ category, subject, message, order_id?, chat_session_id? }` | `201` Created support ticket |
| `GET` | `/api/v1/support/tickets` | `Bearer` | — | `200` User's support tickets |
| `POST` | `/api/v1/media/upload-image` | `Bearer` | `multipart/form-data (image)` | `201` `{ url, public_id, width, height }` (Cloudinary) |

### 2.6 AI Shopping Assistant (`/api/v1/ai`)

| Method | Endpoint | Auth / Permission | Request Body | Response Summary |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/ai/chat` | Optional `Bearer` or `X-Guest-Session-Id` | `{ session_id?, message, context?: { current_product_id? } }` | `200` `{ session_id, reply_markdown, tools_used[], ui_cards: { products?, comparison?, order?, vouchers?, suggested_prompts[] } }` |
| `GET` | `/api/v1/ai/sessions` | Optional `Bearer` or `X-Guest-Session-Id` | — | `200` List of user's chat sessions |
| `GET` | `/api/v1/ai/sessions/:id` | Optional `Bearer` or `X-Guest-Session-Id` | — | `200` Full message history with structured UI cards |

### 2.7 Admin & Operations Endpoints (`/api/v1/admin/*`)

| Method | Endpoint | Required Permission | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/analytics/overview` | `analytics.read` | Revenue, Orders, AOV, Low Stock, AI Spend KPIs + time-series chart |
| `POST / PATCH / DELETE` | `/api/v1/admin/products/*` | `products.write` | Create/update/archive products, variants, and gallery images |
| `POST / PATCH / DELETE` | `/api/v1/admin/categories/*` | `categories.write` | Manage category hierarchy |
| `GET / POST` | `/api/v1/admin/inventory/:variantId/adjust` | `inventory.write` | View inventory ledger and perform audited stock restock/adjustments |
| `GET / PATCH` | `/api/v1/admin/orders/:orderCode/status` | `orders.write` | Advance order state machine, create shipments, process refunds |
| `POST / PATCH` | `/api/v1/admin/vouchers/*` | `promotions.write` | Create and toggle vouchers & promotions |
| `PATCH` | `/api/v1/admin/reviews/:id/moderate` | `reviews.moderate` | Approve/hide review or post official seller reply |
| `GET / PATCH` | `/api/v1/admin/users/*` | `users.manage` | Manage user status (`ACTIVE`/`SUSPENDED`) and assign RBAC roles |
| `GET / PATCH` | `/api/v1/admin/ai/policies` | `ai.manage` | Manage `store_policies` and inspect `ai_usage_logs` |
| `GET` | `/api/v1/admin/audit-logs` | `audit.read` | Query immutable administrative audit trail |

