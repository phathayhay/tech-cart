# 05. DATABASE DESIGN SPECIFICATION

> **Document ID:** `DOC-05`
> **Parent Document:** [PROJECT_MASTER_PLAN.md](file:///d:/MERN_STACK/html/ch05-nodejs/02-practice/shoppingCartBE/docs/PROJECT_MASTER_PLAN.md)
> **Version:** `1.0.0`

---

## 1. Core Database Engineering Standards

1. **RDBMS & ORM:** PostgreSQL 16+ managed via **Prisma ORM** and **Prisma Migrate**.
2. **Primary Keys:** UUID v4 (`UUID DEFAULT gen_random_uuid()`) across all tables for security (prevents ID enumeration) and distributed-safe generation.
3. **Monetary Columns (`DECIMAL(15, 2)`):**
   - **NEVER** use `FLOAT`, `REAL`, or `DOUBLE PRECISION` for money.
   - All prices, subtotals, discounts, shipping fees, taxes, and payment amounts use `DECIMAL(15, 2)`.
   - Default currency is stored explicitly (`currency_code CHAR(3) NOT NULL DEFAULT 'VND'`).
4. **Timestamps & Timezones:**
   - All timestamp columns use `TIMESTAMPTZ` (` TIMESTAMP WITH TIME ZONE`) stored in **UTC**.
   - Every mutable table includes `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
5. **Deletion & Historical Preservation Strategy:**
   - **Hard Delete (`ON DELETE CASCADE`):** Ephemeral join/child records (`user_roles`, `cart_items`, `wishlist_items`, `product_images`, `variant_attribute_values`).
   - **Soft Delete / Status Archival (`deleted_at` or `status = 'ARCHIVED'`):** Catalog entities (`products`, `product_variants`, `categories`, `users`) referenced by historical orders.
   - **Strict Restrict (`ON DELETE RESTRICT`):** Financial and audit records (`orders`, `order_items`, `payments`, `payment_transactions`, `inventory_transactions`, `audit_logs`) can **never** be deleted.

---

## 2. Complete Table Catalog (34 Normalized Tables)

| # | Table Name | Domain | Purpose |
| :--- | :--- | :--- | :--- |
| 1 | `users` | Auth & IAM | Customer and staff accounts, credentials, verification state |
| 2 | `roles` | Auth & IAM | System roles (`CUSTOMER`, `SUPPORT_AGENT`, `INVENTORY_MANAGER`, `SUPER_ADMIN`) |
| 3 | `permissions` | Auth & IAM | Granular permission keys (e.g., `products.write`, `orders.manage`) |
| 4 | `role_permissions` | Auth & IAM | Many-to-many join between `roles` and `permissions` |
| 5 | `user_roles` | Auth & IAM | Many-to-many join between `users` and `roles` |
| 6 | `user_addresses` | Users | Saved customer shipping/billing addresses with default flag |
| 7 | `refresh_tokens` | Auth & IAM | Rotating refresh tokens with token family tracking & revocation |
| 8 | `categories` | Catalog | Hierarchical product categories (`parent_id`) |
| 9 | `products` | Catalog | Master product records, specs JSON, aggregate ratings, wheel flag |
| 10 | `product_images` | Catalog | Ordered Cloudinary product gallery images |
| 11 | `product_attributes` | Catalog | Variant attribute definitions (e.g., `Color`, `Switch Type`) |
| 12 | `product_attribute_values` | Catalog | Allowed values per attribute (e.g., `Matte White`, `Red Linear`) |
| 13 | `product_variants` | Catalog | Purchasable SKU units with specific price, weight, and image |
| 14 | `variant_attribute_values` | Catalog | Join table mapping each `product_variant` to its attribute values |
| 15 | `inventory` | Inventory | 1-to-1 stock state per variant (`quantity_on_hand`, `quantity_reserved`) |
| 16 | `inventory_transactions` | Inventory | Immutable audit ledger of every stock movement |
| 17 | `carts` | Cart | Active shopping carts for authenticated users (`user_id`) or guests (`session_id`) |
| 18 | `cart_items` | Cart | Line items inside a cart referencing `variant_id` and `unit_price_at_add` |
| 19 | `wishlists` | Wishlist | Customer wishlist container (1-to-1 per user) |
| 20 | `wishlist_items` | Wishlist | Saved product/variant items inside a customer's wishlist |
| 21 | `promotions` | Promotions | Catalog/category time-bound promotional campaigns |
| 22 | `vouchers` | Promotions | Discount codes (`PERCENTAGE`, `FIXED_AMOUNT`, `FREE_SHIPPING`) |
| 23 | `voucher_usages` | Promotions | Ledger tracking voucher redemptions per user and order |
| 24 | `orders` | Orders | Master order header, financial breakdown, shipping snapshot |
| 25 | `order_items` | Orders | Immutable snapshot of purchased SKUs, unit prices, and discounts |
| 26 | `order_status_history` | Orders | Immutable timeline of every order status change |
| 27 | `payments` | Payments | Payment state per order (`method`, `status`, `amount`) |
| 28 | `payment_transactions` | Payments | Gateway webhook callbacks, charges, and refunds (`provider_tx_id`) |
| 29 | `shipments` | Shipping | Carrier tracking numbers, dispatch/delivery timestamps |
| 30 | `reviews` | Reviews | Verified purchase ratings ($1\text{–}5$), comments, moderation status |
| 31 | `review_images` | Reviews | Cloudinary photos attached to product reviews |
| 32 | `notifications` | Notifications | In-app and email notification records per user |
| 33 | `notification_preferences`| Notifications | User opt-in/out settings per channel and category |
| 34 | `support_tickets` | Support | Customer support & AI-escalated tickets (with `support_ticket_messages` & `store_policies`) |
| 35 | `chat_sessions` | AI Assistant | Conversational sessions for the AI Shopping Assistant |
| 36 | `chat_messages` | AI Assistant | User, Assistant, and Tool messages with structured UI attachments |
| 37 | `ai_usage_logs` | AI Assistant | Token counts, latency, tool calls, and USD cost telemetry |
| 38 | `audit_logs` | Security | Immutable administrative and security audit log |

*(Note: Including join tables `role_permissions`, `variant_attribute_values`, `support_ticket_messages`, and `store_policies`, the schema comprises 38 normalized tables covering all candidate entities.)*

---

## 3. Detailed Table Specifications (Key Domain Tables)

### 3.1 Identity & Access (`users`, `roles`, `permissions`, `refresh_tokens`, `user_addresses`)
- **`users`**:
  - PK: `id UUID`
  - Unique: `email VARCHAR(255) NOT NULL UNIQUE`, `username VARCHAR(100) UNIQUE`, `google_id VARCHAR(128) UNIQUE`
  - Columns: `password_hash VARCHAR(255) NOT NULL`, `auth_provider VARCHAR(30) NOT NULL DEFAULT 'LOCAL'` (`LOCAL`, `GOOGLE`), `full_name VARCHAR(150) NOT NULL`, `phone VARCHAR(30)`, `avatar_url TEXT`, `date_of_birth DATE`, `email_verified_at TIMESTAMPTZ`, `account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'` (`ACTIVE`, `UNVERIFIED`, `SUSPENDED`), `failed_login_count INT NOT NULL DEFAULT 0`, `locked_until TIMESTAMPTZ`, `created_at`, `updated_at`, `deleted_at`.
  - Indexes: `idx_users_email`, `idx_users_status`.
- **`refresh_tokens`**:
  - PK: `id UUID`
  - FK: `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`
  - Columns: `token_hash VARCHAR(255) NOT NULL UNIQUE`, `family_id UUID NOT NULL`, `is_revoked BOOLEAN NOT NULL DEFAULT FALSE`, `replaced_by_id UUID`, `ip_address VARCHAR(64)`, `user_agent TEXT`, `expires_at TIMESTAMPTZ NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
  - Indexes: `idx_refresh_tokens_user_id`, `idx_refresh_tokens_family_id`, `idx_refresh_tokens_expires_at`.

### 3.2 Product Catalog & Variants (`categories`, `products`, `product_variants`, `inventory`)
- **`products`**:
  - PK: `id UUID`
  - FK: `category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT`
  - Unique: `slug VARCHAR(255) NOT NULL UNIQUE`, `sku_prefix VARCHAR(64) NOT NULL UNIQUE`
  - Columns: `name VARCHAR(255) NOT NULL`, `brand VARCHAR(120) NOT NULL`, `short_description VARCHAR(500)`, `description TEXT NOT NULL`, `specifications JSONB NOT NULL DEFAULT '{}'`, `base_price DECIMAL(15,2) NOT NULL`, `compare_at_price DECIMAL(15,2)`, `currency_code CHAR(3) NOT NULL DEFAULT 'USD'`, `rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0.00`, `rating_count INT NOT NULL DEFAULT 0`, `sold_count INT NOT NULL DEFAULT 0`, `is_featured_on_wheel BOOLEAN NOT NULL DEFAULT FALSE`, `wheel_sort_order INT DEFAULT 0`, `status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'` (`DRAFT`, `ACTIVE`, `ARCHIVED`), `created_at`, `updated_at`, `deleted_at`.
  - Constraints: `CHECK (base_price >= 0)`, `CHECK (compare_at_price IS NULL OR compare_at_price >= base_price)`.
  - Indexes: `idx_products_category_status`, `idx_products_brand`, `idx_products_price`, `idx_products_wheel (is_featured_on_wheel, wheel_sort_order)`.
- **`product_variants`**:
  - PK: `id UUID`
  - FK: `product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT`
  - Unique: `sku VARCHAR(100) NOT NULL UNIQUE`
  - Columns: `variant_name VARCHAR(255) NOT NULL`, `price DECIMAL(15,2) NOT NULL`, `compare_at_price DECIMAL(15,2)`, `cost_price DECIMAL(15,2)`, `weight_grams INT NOT NULL DEFAULT 500`, `image_url TEXT`, `is_default BOOLEAN NOT NULL DEFAULT FALSE`, `is_active BOOLEAN NOT NULL DEFAULT TRUE`, `created_at`, `updated_at`.
  - Constraints: `CHECK (price >= 0)`.
- **`inventory`**:
  - PK: `id UUID`
  - FK: `variant_id UUID NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE RESTRICT`
  - Columns: `quantity_on_hand INT NOT NULL DEFAULT 0`, `quantity_reserved INT NOT NULL DEFAULT 0`, `low_stock_threshold INT NOT NULL DEFAULT 5`, `warehouse_location VARCHAR(100) DEFAULT 'MAIN-WH'`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
  - Constraints: `CHECK (quantity_on_hand >= 0)`, `CHECK (quantity_reserved >= 0)`, `CHECK (quantity_on_hand >= quantity_reserved)`.

### 3.3 Cart, Checkout, Orders & Payments (`carts`, `orders`, `order_items`, `payments`)
- **`carts`**:
  - PK: `id UUID`
  - FK: `user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE` (nullable for guest carts)
  - Unique: `session_id VARCHAR(128) UNIQUE` (nullable for authenticated carts)
  - Columns: `status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'` (`ACTIVE`, `MERGED`, `ABANDONED`), `expires_at TIMESTAMPTZ`, `created_at`, `updated_at`.
  - Constraint: `CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)`.
- **`cart_items`**:
  - PK: `id UUID`
  - FK: `cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE`, `variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE`
  - Unique: `UNIQUE (cart_id, variant_id)`
  - Columns: `quantity INT NOT NULL CHECK (quantity > 0 AND quantity <= 50)`, `unit_price_at_add DECIMAL(15,2) NOT NULL`, `created_at`, `updated_at`.
- **`orders`**:
  - PK: `id UUID`
  - FK: `user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT`, `voucher_id UUID REFERENCES vouchers(id) ON DELETE RESTRICT`
  - Unique: `order_code VARCHAR(40) NOT NULL UNIQUE`, `idempotency_key VARCHAR(128) UNIQUE`
  - Columns:
    - Statuses: `status VARCHAR(30) NOT NULL DEFAULT 'PENDING'`, `payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID'`, `payment_method VARCHAR(30) NOT NULL`
    - Monetary (`DECIMAL(15,2)`): `subtotal DECIMAL(15,2) NOT NULL`, `discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00`, `shipping_fee DECIMAL(15,2) NOT NULL DEFAULT 0.00`, `tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00`, `grand_total DECIMAL(15,2) NOT NULL`, `currency_code CHAR(3) NOT NULL DEFAULT 'USD'`
    - Snapshots: `voucher_code_snapshot VARCHAR(50)`, `shipping_recipient_name VARCHAR(150) NOT NULL`, `shipping_phone VARCHAR(30) NOT NULL`, `shipping_address_snapshot JSONB NOT NULL`, `customer_note TEXT`, `cancel_reason TEXT`
    - Timestamps: `reservation_expires_at TIMESTAMPTZ`, `paid_at TIMESTAMPTZ`, `cancelled_at TIMESTAMPTZ`, `completed_at TIMESTAMPTZ`, `created_at`, `updated_at`.
  - Constraints: `CHECK (subtotal >= 0 AND discount_amount >= 0 AND shipping_fee >= 0 AND tax_amount >= 0 AND grand_total >= 0)`.
- **`order_items`**:
  - PK: `id UUID`
  - FK: `order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT`, `product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT`, `variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT`
  - Columns: `product_name_snapshot VARCHAR(255) NOT NULL`, `variant_name_snapshot VARCHAR(255) NOT NULL`, `sku_snapshot VARCHAR(100) NOT NULL`, `image_url_snapshot TEXT`, `attributes_snapshot JSONB NOT NULL DEFAULT '{}'`, `quantity INT NOT NULL CHECK (quantity > 0)`, `unit_price DECIMAL(15,2) NOT NULL`, `discount_allocated DECIMAL(15,2) NOT NULL DEFAULT 0.00`, `line_total DECIMAL(15,2) NOT NULL`, `created_at`.

---

## 4. Authoritative Prisma Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("POSTGRES_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearchPostgres"]
}

enum AccountStatus {
  UNVERIFIED
  ACTIVE
  SUSPENDED
}

enum ProductStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum CartStatus {
  ACTIVE
  MERGED
  ABANDONED
}

enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
  FREE_SHIPPING
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  COMPLETED
  CANCELLED
  RETURN_REQUESTED
  REFUNDED
}

enum PaymentStatus {
  UNPAID
  PENDING
  PAID
  FAILED
  REFUND_PENDING
  PARTIALLY_REFUNDED
  REFUNDED
}

enum PaymentMethod {
  COD
  VNPAY
  STRIPE
  MOMO
}

enum InventoryTxType {
  INITIAL_SEED
  RESTOCK
  RESERVE
  RELEASE
  SALE_DEDUCT
  RETURN_RESTOCK
  MANUAL_ADJUSTMENT
}

enum ShipmentStatus {
  PREPARING
  SHIPPED
  IN_TRANSIT
  OUT_FOR_DELIVERY
  DELIVERED
  DELIVERY_FAILED
  RETURNED
}

enum ReviewStatus {
  PENDING
  APPROVED
  HIDDEN
  FLAGGED
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  WAITING_CUSTOMER
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum ChatRole {
  SYSTEM
  USER
  ASSISTANT
  TOOL
}

model User {
  id                 String        @id @default(uuid()) @db.Uuid
  email              String        @unique @db.VarChar(255)
  username           String?       @unique @db.VarChar(100)
  passwordHash       String        @map("password_hash") @db.VarChar(255)
  fullName           String        @map("full_name") @db.VarChar(150)
  phone              String?       @db.VarChar(30)
  avatarUrl          String?       @map("avatar_url")
  dateOfBirth        DateTime?     @map("date_of_birth") @db.Date
  bio                String?       @db.VarChar(500)
  emailVerifiedAt    DateTime?     @map("email_verified_at") @db.Timestamptz(6)
  emailVerifyToken   String?       @map("email_verify_token") @db.VarChar(255)
  forgotPassToken    String?       @map("forgot_pass_token") @db.VarChar(255)
  accountStatus      AccountStatus @default(ACTIVE) @map("account_status")
  failedLoginCount   Int           @default(0) @map("failed_login_count")
  lockedUntil        DateTime?     @map("locked_until") @db.Timestamptz(6)
  createdAt          DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt          DateTime?     @map("deleted_at") @db.Timestamptz(6)

  userRoles          UserRole[]
  addresses          UserAddress[]
  refreshTokens      RefreshToken[]
  cart               Cart?
  wishlist           Wishlist?
  orders             Order[]
  reviews            Review[]
  voucherUsages      VoucherUsage[]
  notifications      Notification[]
  notificationPref   NotificationPreference?
  supportTickets     SupportTicket[]
  chatSessions       ChatSession[]
  aiUsageLogs        AiUsageLog[]
  auditLogs          AuditLog[]

  @@index([accountStatus])
  @@map("users")
}

model Role {
  id              String           @id @default(uuid()) @db.Uuid
  code            String           @unique @db.VarChar(50)
  name            String           @db.VarChar(100)
  description     String?
  createdAt       DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)

  userRoles       UserRole[]
  rolePermissions RolePermission[]

  @@map("roles")
}

model Permission {
  id              String           @id @default(uuid()) @db.Uuid
  code            String           @unique @db.VarChar(100)
  module          String           @db.VarChar(50)
  description     String?

  rolePermissions RolePermission[]

  @@map("permissions")
}

model RolePermission {
  roleId       String     @map("role_id") @db.Uuid
  permissionId String     @map("permission_id") @db.Uuid
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}

model UserRole {
  userId     String   @map("user_id") @db.Uuid
  roleId     String   @map("role_id") @db.Uuid
  assignedAt DateTime @default(now()) @map("assigned_at") @db.Timestamptz(6)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role       Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@map("user_roles")
}

model UserAddress {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  label         String   @default("Home") @db.VarChar(50)
  recipientName String   @map("recipient_name") @db.VarChar(150)
  phone         String   @db.VarChar(30)
  streetLine1   String   @map("street_line1") @db.VarChar(255)
  streetLine2   String?  @map("street_line2") @db.VarChar(255)
  ward          String?  @db.VarChar(100)
  district      String   @db.VarChar(100)
  city          String   @db.VarChar(100)
  postalCode    String?  @map("postal_code") @db.VarChar(20)
  countryCode   String   @default("VN") @map("country_code") @db.Char(2)
  isDefault     Boolean  @default(false) @map("is_default")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isDefault])
  @@map("user_addresses")
}

model RefreshToken {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  tokenHash    String   @unique @map("token_hash") @db.VarChar(255)
  familyId     String   @map("family_id") @db.Uuid
  isRevoked    Boolean  @default(false) @map("is_revoked")
  replacedById String?  @map("replaced_by_id") @db.Uuid
  ipAddress    String?  @map("ip_address") @db.VarChar(64)
  userAgent    String?  @map("user_agent")
  expiresAt    DateTime @map("expires_at") @db.Timestamptz(6)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([familyId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

model Category {
  id          String     @id @default(uuid()) @db.Uuid
  parentId    String?    @map("parent_id") @db.Uuid
  name        String     @db.VarChar(120)
  slug        String     @unique @db.VarChar(150)
  description String?
  imageUrl    String?    @map("image_url")
  sortOrder   Int        @default(0) @map("sort_order")
  isActive    Boolean    @default(true) @map("is_active")
  createdAt   DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime   @updatedAt @map("updated_at") @db.Timestamptz(6)

  parent      Category?  @relation("CategoryToCategory", fields: [parentId], references: [id], onDelete: Restrict)
  children    Category[] @relation("CategoryToCategory")
  products    Product[]
  promotions  Promotion[]

  @@index([parentId, isActive])
  @@map("categories")
}

model Product {
  id                String         @id @default(uuid()) @db.Uuid
  categoryId        String         @map("category_id") @db.Uuid
  name              String         @db.VarChar(255)
  slug              String         @unique @db.VarChar(255)
  skuPrefix         String         @unique @map("sku_prefix") @db.VarChar(64)
  brand             String         @db.VarChar(120)
  shortDescription  String?        @map("short_description") @db.VarChar(500)
  description       String
  specifications    Json           @default("{}")
  basePrice         Decimal        @map("base_price") @db.Decimal(15, 2)
  compareAtPrice    Decimal?       @map("compare_at_price") @db.Decimal(15, 2)
  currencyCode      String         @default("USD") @map("currency_code") @db.Char(3)
  ratingAvg         Decimal        @default(0.00) @map("rating_avg") @db.Decimal(3, 2)
  ratingCount       Int            @default(0) @map("rating_count")
  soldCount         Int            @default(0) @map("sold_count")
  isFeaturedOnWheel Boolean        @default(false) @map("is_featured_on_wheel")
  wheelSortOrder    Int            @default(0) @map("wheel_sort_order")
  status            ProductStatus  @default(ACTIVE)
  createdAt         DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime       @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt         DateTime?      @map("deleted_at") @db.Timestamptz(6)

  category          Category       @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  images            ProductImage[]
  variants          ProductVariant[]
  orderItems        OrderItem[]
  wishlistItems     WishlistItem[]
  reviews           Review[]

  @@index([categoryId, status])
  @@index([brand])
  @@index([basePrice])
  @@index([isFeaturedOnWheel, wheelSortOrder])
  @@map("products")
}

model ProductImage {
  id        String   @id @default(uuid()) @db.Uuid
  productId String   @map("product_id") @db.Uuid
  url       String
  publicId  String?  @map("public_id") @db.VarChar(255)
  altText   String?  @map("alt_text") @db.VarChar(255)
  sortOrder Int      @default(0) @map("sort_order")
  isPrimary Boolean  @default(false) @map("is_primary")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId, sortOrder])
  @@map("product_images")
}

model ProductAttribute {
  id          String                  @id @default(uuid()) @db.Uuid
  code        String                  @unique @db.VarChar(60)
  name        String                  @db.VarChar(100)
  createdAt   DateTime                @default(now()) @map("created_at") @db.Timestamptz(6)

  values      ProductAttributeValue[]

  @@map("product_attributes")
}

model ProductAttributeValue {
  id          String                   @id @default(uuid()) @db.Uuid
  attributeId String                   @map("attribute_id") @db.Uuid
  value       String                   @db.VarChar(100)
  swatchHex   String?                  @map("swatch_hex") @db.VarChar(20)
  sortOrder   Int                      @default(0) @map("sort_order")

  attribute   ProductAttribute         @relation(fields: [attributeId], references: [id], onDelete: Cascade)
  variants    VariantAttributeValue[]

  @@unique([attributeId, value])
  @@map("product_attribute_values")
}

model ProductVariant {
  id               String                  @id @default(uuid()) @db.Uuid
  productId        String                  @map("product_id") @db.Uuid
  sku              String                  @unique @db.VarChar(100)
  variantName      String                  @map("variant_name") @db.VarChar(255)
  price            Decimal                 @db.Decimal(15, 2)
  compareAtPrice   Decimal?                @map("compare_at_price") @db.Decimal(15, 2)
  costPrice        Decimal?                @map("cost_price") @db.Decimal(15, 2)
  weightGrams      Int                     @default(500) @map("weight_grams")
  imageUrl         String?                 @map("image_url")
  isDefault        Boolean                 @default(false) @map("is_default")
  isActive         Boolean                 @default(true) @map("is_active")
  createdAt        DateTime                @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime                @updatedAt @map("updated_at") @db.Timestamptz(6)

  product          Product                 @relation(fields: [productId], references: [id], onDelete: Restrict)
  attributeValues  VariantAttributeValue[]
  inventory        Inventory?
  cartItems        CartItem[]
  wishlistItems    WishlistItem[]
  orderItems       OrderItem[]

  @@index([productId, isActive])
  @@map("product_variants")
}

model VariantAttributeValue {
  variantId        String                @map("variant_id") @db.Uuid
  attributeValueId String                @map("attribute_value_id") @db.Uuid
  variant          ProductVariant        @relation(fields: [variantId], references: [id], onDelete: Cascade)
  attributeValue   ProductAttributeValue @relation(fields: [attributeValueId], references: [id], onDelete: Cascade)

  @@id([variantId, attributeValueId])
  @@map("variant_attribute_values")
}

model Inventory {
  id                String                 @id @default(uuid()) @db.Uuid
  variantId         String                 @unique @map("variant_id") @db.Uuid
  quantityOnHand    Int                    @default(0) @map("quantity_on_hand")
  quantityReserved  Int                    @default(0) @map("quantity_reserved")
  lowStockThreshold Int                    @default(5) @map("low_stock_threshold")
  warehouseLocation String                 @default("MAIN-WH") @map("warehouse_location") @db.VarChar(100)
  updatedAt         DateTime               @updatedAt @map("updated_at") @db.Timestamptz(6)

  variant           ProductVariant         @relation(fields: [variantId], references: [id], onDelete: Restrict)
  transactions      InventoryTransaction[]

  @@map("inventory")
}

model InventoryTransaction {
  id             String          @id @default(uuid()) @db.Uuid
  inventoryId    String          @map("inventory_id") @db.Uuid
  txType         InventoryTxType @map("tx_type")
  quantityChange Int             @map("quantity_change")
  balanceAfter   Int             @map("balance_after")
  referenceType  String          @map("reference_type") @db.VarChar(50)
  referenceId    String?         @map("reference_id") @db.Uuid
  actorUserId    String?         @map("actor_user_id") @db.Uuid
  note           String?
  createdAt      DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)

  inventory      Inventory       @relation(fields: [inventoryId], references: [id], onDelete: Restrict)

  @@index([inventoryId, createdAt])
  @@index([referenceType, referenceId])
  @@map("inventory_transactions")
}

model Cart {
  id        String     @id @default(uuid()) @db.Uuid
  userId    String?    @unique @map("user_id") @db.Uuid
  sessionId String?    @unique @map("session_id") @db.VarChar(128)
  status    CartStatus @default(ACTIVE)
  expiresAt DateTime?  @map("expires_at") @db.Timestamptz(6)
  createdAt DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime   @updatedAt @map("updated_at") @db.Timestamptz(6)

  user      User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     CartItem[]

  @@map("carts")
}

model CartItem {
  id             String         @id @default(uuid()) @db.Uuid
  cartId         String         @map("cart_id") @db.Uuid
  variantId      String         @map("variant_id") @db.Uuid
  quantity       Int
  unitPriceAtAdd Decimal        @map("unit_price_at_add") @db.Decimal(15, 2)
  createdAt      DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime       @updatedAt @map("updated_at") @db.Timestamptz(6)

  cart           Cart           @relation(fields: [cartId], references: [id], onDelete: Cascade)
  variant        ProductVariant @relation(fields: [variantId], references: [id], onDelete: Cascade)

  @@unique([cartId, variantId])
  @@map("cart_items")
}

model Wishlist {
  id        String         @id @default(uuid()) @db.Uuid
  userId    String         @unique @map("user_id") @db.Uuid
  createdAt DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime       @updatedAt @map("updated_at") @db.Timestamptz(6)

  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     WishlistItem[]

  @@map("wishlists")
}

model WishlistItem {
  id         String          @id @default(uuid()) @db.Uuid
  wishlistId String          @map("wishlist_id") @db.Uuid
  productId  String          @map("product_id") @db.Uuid
  variantId  String?         @map("variant_id") @db.Uuid
  createdAt  DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)

  wishlist   Wishlist        @relation(fields: [wishlistId], references: [id], onDelete: Cascade)
  product    Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  variant    ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)

  @@unique([wishlistId, productId, variantId])
  @@map("wishlist_items")
}

model Promotion {
  id            String       @id @default(uuid()) @db.Uuid
  name          String       @db.VarChar(150)
  description   String?
  categoryId    String?      @map("category_id") @db.Uuid
  discountType  DiscountType @map("discount_type")
  discountValue Decimal      @map("discount_value") @db.Decimal(15, 2)
  startAt       DateTime     @map("start_at") @db.Timestamptz(6)
  endAt         DateTime     @map("end_at") @db.Timestamptz(6)
  isActive      Boolean      @default(true) @map("is_active")
  createdAt     DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)

  category      Category?    @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  @@index([isActive, startAt, endAt])
  @@map("promotions")
}

model Voucher {
  id                String         @id @default(uuid()) @db.Uuid
  code              String         @unique @db.VarChar(50)
  name              String         @db.VarChar(150)
  description       String?
  discountType      DiscountType   @map("discount_type")
  discountValue     Decimal        @map("discount_value") @db.Decimal(15, 2)
  maxDiscountAmount Decimal?       @map("max_discount_amount") @db.Decimal(15, 2)
  minOrderSubtotal  Decimal        @default(0.00) @map("min_order_subtotal") @db.Decimal(15, 2)
  usageLimitTotal   Int?           @map("usage_limit_total")
  usageLimitPerUser Int            @default(1) @map("usage_limit_per_user")
  usedCount         Int            @default(0) @map("used_count")
  startAt           DateTime       @map("start_at") @db.Timestamptz(6)
  endAt             DateTime       @map("end_at") @db.Timestamptz(6)
  isActive          Boolean        @default(true) @map("is_active")
  createdAt         DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime       @updatedAt @map("updated_at") @db.Timestamptz(6)

  orders            Order[]
  usages            VoucherUsage[]

  @@index([code, isActive])
  @@map("vouchers")
}

model VoucherUsage {
  id             String   @id @default(uuid()) @db.Uuid
  voucherId      String   @map("voucher_id") @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  orderId        String   @unique @map("order_id") @db.Uuid
  discountAmount Decimal  @map("discount_amount") @db.Decimal(15, 2)
  usedAt         DateTime @default(now()) @map("used_at") @db.Timestamptz(6)

  voucher        Voucher  @relation(fields: [voucherId], references: [id], onDelete: Restrict)
  user           User     @relation(fields: [userId], references: [id], onDelete: Restrict)
  order          Order    @relation(fields: [orderId], references: [id], onDelete: Restrict)

  @@index([voucherId, userId])
  @@map("voucher_usages")
}

model Order {
  id                        String               @id @default(uuid()) @db.Uuid
  orderCode                 String               @unique @map("order_code") @db.VarChar(40)
  userId                    String               @map("user_id") @db.Uuid
  voucherId                 String?              @map("voucher_id") @db.Uuid
  idempotencyKey            String?              @unique @map("idempotency_key") @db.VarChar(128)
  status                    OrderStatus          @default(PENDING)
  paymentStatus             PaymentStatus        @default(UNPAID) @map("payment_status")
  paymentMethod             PaymentMethod        @map("payment_method")
  subtotal                  Decimal              @db.Decimal(15, 2)
  discountAmount            Decimal              @default(0.00) @map("discount_amount") @db.Decimal(15, 2)
  shippingFee               Decimal              @default(0.00) @map("shipping_fee") @db.Decimal(15, 2)
  taxAmount                 Decimal              @default(0.00) @map("tax_amount") @db.Decimal(15, 2)
  grandTotal                Decimal              @map("grand_total") @db.Decimal(15, 2)
  currencyCode              String               @default("USD") @map("currency_code") @db.Char(3)
  voucherCodeSnapshot       String?              @map("voucher_code_snapshot") @db.VarChar(50)
  shippingMethod            String               @default("STANDARD") @map("shipping_method") @db.VarChar(50)
  shippingRecipientName     String               @map("shipping_recipient_name") @db.VarChar(150)
  shippingPhone             String               @map("shipping_phone") @db.VarChar(30)
  shippingAddressSnapshot   Json                 @map("shipping_address_snapshot")
  customerNote              String?              @map("customer_note")
  cancelReason              String?              @map("cancel_reason")
  reservationExpiresAt      DateTime?            @map("reservation_expires_at") @db.Timestamptz(6)
  paidAt                    DateTime?            @map("paid_at") @db.Timestamptz(6)
  cancelledAt               DateTime?            @map("cancelled_at") @db.Timestamptz(6)
  completedAt               DateTime?            @map("completed_at") @db.Timestamptz(6)
  createdAt                 DateTime             @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt                 DateTime             @updatedAt @map("updated_at") @db.Timestamptz(6)

  user                      User                 @relation(fields: [userId], references: [id], onDelete: Restrict)
  voucher                   Voucher?             @relation(fields: [voucherId], references: [id], onDelete: Restrict)
  items                     OrderItem[]
  statusHistory             OrderStatusHistory[]
  payment                   Payment?
  voucherUsage              VoucherUsage?
  shipments                 Shipment[]
  reviews                   Review[]

  @@index([userId, createdAt])
  @@index([status, paymentStatus])
  @@index([reservationExpiresAt])
  @@map("orders")
}

model OrderItem {
  id                  String         @id @default(uuid()) @db.Uuid
  orderId             String         @map("order_id") @db.Uuid
  productId           String         @map("product_id") @db.Uuid
  variantId           String         @map("variant_id") @db.Uuid
  productNameSnapshot String         @map("product_name_snapshot") @db.VarChar(255)
  variantNameSnapshot String         @map("variant_name_snapshot") @db.VarChar(255)
  skuSnapshot         String         @map("sku_snapshot") @db.VarChar(100)
  imageUrlSnapshot    String?        @map("image_url_snapshot")
  attributesSnapshot  Json           @default("{}") @map("attributes_snapshot")
  quantity            Int
  unitPrice           Decimal        @map("unit_price") @db.Decimal(15, 2)
  discountAllocated   Decimal        @default(0.00) @map("discount_allocated") @db.Decimal(15, 2)
  lineTotal           Decimal        @map("line_total") @db.Decimal(15, 2)
  createdAt           DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)

  order               Order          @relation(fields: [orderId], references: [id], onDelete: Restrict)
  product             Product        @relation(fields: [productId], references: [id], onDelete: Restrict)
  variant             ProductVariant @relation(fields: [variantId], references: [id], onDelete: Restrict)

  @@index([orderId])
  @@map("order_items")
}

model OrderStatusHistory {
  id          String       @id @default(uuid()) @db.Uuid
  orderId     String       @map("order_id") @db.Uuid
  fromStatus  OrderStatus? @map("from_status")
  toStatus    OrderStatus  @map("to_status")
  changedById String?      @map("changed_by_id") @db.Uuid
  note        String?
  createdAt   DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)

  order       Order        @relation(fields: [orderId], references: [id], onDelete: Restrict)

  @@index([orderId, createdAt])
  @@map("order_status_history")
}

model Payment {
  id           String               @id @default(uuid()) @db.Uuid
  orderId      String               @unique @map("order_id") @db.Uuid
  method       PaymentMethod
  status       PaymentStatus        @default(UNPAID)
  amount       Decimal              @db.Decimal(15, 2)
  currencyCode String               @default("USD") @map("currency_code") @db.Char(3)
  paidAmount   Decimal              @default(0.00) @map("paid_amount") @db.Decimal(15, 2)
  refundAmount Decimal              @default(0.00) @map("refund_amount") @db.Decimal(15, 2)
  createdAt    DateTime             @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime             @updatedAt @map("updated_at") @db.Timestamptz(6)

  order        Order                @relation(fields: [orderId], references: [id], onDelete: Restrict)
  transactions PaymentTransaction[]

  @@map("payments")
}

model PaymentTransaction {
  id                    String   @id @default(uuid()) @db.Uuid
  paymentId             String   @map("payment_id") @db.Uuid
  txType                String   @map("tx_type") @db.VarChar(30) // CHARGE, WEBHOOK_CONFIRM, REFUND
  provider              String   @db.VarChar(50)
  providerTransactionId String   @unique @map("provider_transaction_id") @db.VarChar(150)
  amount                Decimal  @db.Decimal(15, 2)
  status                String   @db.VarChar(30)
  rawPayload            Json     @default("{}") @map("raw_payload")
  createdAt             DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  payment               Payment  @relation(fields: [paymentId], references: [id], onDelete: Restrict)

  @@index([paymentId])
  @@map("payment_transactions")
}

model Shipment {
  id                  String         @id @default(uuid()) @db.Uuid
  orderId             String         @map("order_id") @db.Uuid
  carrierName         String         @map("carrier_name") @db.VarChar(100)
  trackingNumber      String         @unique @map("tracking_number") @db.VarChar(100)
  trackingUrl         String?        @map("tracking_url")
  status              ShipmentStatus @default(PREPARING)
  estimatedDeliveryAt DateTime?      @map("estimated_delivery_at") @db.Timestamptz(6)
  shippedAt           DateTime?      @map("shipped_at") @db.Timestamptz(6)
  deliveredAt         DateTime?      @map("delivered_at") @db.Timestamptz(6)
  createdAt           DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt           DateTime       @updatedAt @map("updated_at") @db.Timestamptz(6)

  order               Order          @relation(fields: [orderId], references: [id], onDelete: Restrict)

  @@index([orderId])
  @@map("shipments")
}

model Review {
  id                 String        @id @default(uuid()) @db.Uuid
  userId             String        @map("user_id") @db.Uuid
  productId          String        @map("product_id") @db.Uuid
  orderId            String        @map("order_id") @db.Uuid
  rating             Int
  title              String?       @db.VarChar(150)
  comment            String
  isVerifiedPurchase Boolean       @default(true) @map("is_verified_purchase")
  status             ReviewStatus  @default(APPROVED)
  adminReply         String?       @map("admin_reply")
  repliedAt          DateTime?     @map("replied_at") @db.Timestamptz(6)
  createdAt          DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)

  user               User          @relation(fields: [userId], references: [id], onDelete: Restrict)
  product            Product       @relation(fields: [productId], references: [id], onDelete: Restrict)
  order              Order         @relation(fields: [orderId], references: [id], onDelete: Restrict)
  images             ReviewImage[]

  @@unique([userId, productId, orderId])
  @@index([productId, status, rating])
  @@map("reviews")
}

model ReviewImage {
  id        String   @id @default(uuid()) @db.Uuid
  reviewId  String   @map("review_id") @db.Uuid
  url       String
  publicId  String?  @map("public_id") @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  review    Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  @@map("review_images")
}

model Notification {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  type      String    @db.VarChar(50)
  title     String    @db.VarChar(200)
  body      String
  actionUrl String?   @map("action_url")
  isRead    Boolean   @default(false) @map("is_read")
  readAt    DateTime? @map("read_at") @db.Timestamptz(6)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead, createdAt])
  @@map("notifications")
}

model NotificationPreference {
  id                  String   @id @default(uuid()) @db.Uuid
  userId              String   @unique @map("user_id") @db.Uuid
  emailOrderUpdates   Boolean  @default(true) @map("email_order_updates")
  emailPromotions     Boolean  @default(true) @map("email_promotions")
  inAppOrderUpdates   Boolean  @default(true) @map("in_app_order_updates")
  inAppPromotions     Boolean  @default(true) @map("in_app_promotions")
  updatedAt           DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notification_preferences")
}

model SupportTicket {
  id            String                 @id @default(uuid()) @db.Uuid
  ticketCode    String                 @unique @map("ticket_code") @db.VarChar(40)
  userId        String                 @map("user_id") @db.Uuid
  orderId       String?                @map("order_id") @db.Uuid
  chatSessionId String?                @map("chat_session_id") @db.Uuid
  category      String                 @db.VarChar(50)
  priority      TicketPriority         @default(MEDIUM)
  status        TicketStatus           @default(OPEN)
  subject       String                 @db.VarChar(255)
  assignedToId  String?                @map("assigned_to_id") @db.Uuid
  createdAt     DateTime               @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime               @updatedAt @map("updated_at") @db.Timestamptz(6)

  user          User                   @relation(fields: [userId], references: [id], onDelete: Restrict)
  messages      SupportTicketMessage[]

  @@index([userId, status])
  @@map("support_tickets")
}

model SupportTicketMessage {
  id        String        @id @default(uuid()) @db.Uuid
  ticketId  String        @map("ticket_id") @db.Uuid
  senderId  String        @map("sender_id") @db.Uuid
  body      String
  createdAt DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)

  ticket    SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)

  @@index([ticketId, createdAt])
  @@map("support_ticket_messages")
}

model StorePolicy {
  id        String   @id @default(uuid()) @db.Uuid
  slug      String   @unique @db.VarChar(100)
  category  String   @db.VarChar(50) // SHIPPING, RETURNS, WARRANTY, PAYMENT, FAQ
  title     String   @db.VarChar(200)
  content   String
  isActive  Boolean  @default(true) @map("is_active")
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@index([category, isActive])
  @@map("store_policies")
}

model ChatSession {
  id        String        @id @default(uuid()) @db.Uuid
  userId    String?       @map("user_id") @db.Uuid
  sessionId String?       @map("session_id") @db.VarChar(128)
  title     String        @default("Shopping Assistant Chat") @db.VarChar(200)
  isActive  Boolean       @default(true) @map("is_active")
  createdAt DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)

  user      User?         @relation(fields: [userId], references: [id], onDelete: SetNull)
  messages  ChatMessage[]
  usageLogs AiUsageLog[]

  @@index([userId, updatedAt])
  @@index([sessionId])
  @@map("chat_sessions")
}

model ChatMessage {
  id                String      @id @default(uuid()) @db.Uuid
  chatSessionId     String      @map("chat_session_id") @db.Uuid
  role              ChatRole
  content           String
  toolCallsPayload  Json?       @map("tool_calls_payload")
  structuredUiCards Json?       @map("structured_ui_cards")
  createdAt         DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)

  chatSession       ChatSession @relation(fields: [chatSessionId], references: [id], onDelete: Cascade)

  @@index([chatSessionId, createdAt])
  @@map("chat_messages")
}

model AiUsageLog {
  id               String       @id @default(uuid()) @db.Uuid
  chatSessionId    String?      @map("chat_session_id") @db.Uuid
  userId           String?      @map("user_id") @db.Uuid
  modelName        String       @map("model_name") @db.VarChar(80)
  promptTokens     Int          @map("prompt_tokens")
  completionTokens Int          @map("completion_tokens")
  totalTokens      Int          @map("total_tokens")
  toolsCalled      String[]     @map("tools_called")
  latencyMs        Int          @map("latency_ms")
  estimatedCostUsd Decimal      @map("estimated_cost_usd") @db.Decimal(10, 6)
  status           String       @db.VarChar(30)
  errorMessage     String?      @map("error_message")
  createdAt        DateTime     @default(now()) @map("created_at") @db.Timestamptz(6)

  chatSession      ChatSession? @relation(fields: [chatSessionId], references: [id], onDelete: SetNull)
  user             User?        @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([createdAt])
  @@index([userId, createdAt])
  @@map("ai_usage_logs")
}

model AuditLog {
  id          String   @id @default(uuid()) @db.Uuid
  actorUserId String?  @map("actor_user_id") @db.Uuid
  action      String   @db.VarChar(100)
  entityType  String   @map("entity_type") @db.VarChar(80)
  entityId    String?  @map("entity_id") @db.VarChar(100)
  beforeState Json?    @map("before_state")
  afterState  Json?    @map("after_state")
  ipAddress   String?  @map("ip_address") @db.VarChar(64)
  userAgent   String?  @map("user_agent")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  actor       User?    @relation(fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([entityType, entityId])
  @@index([actorUserId, createdAt])
  @@map("audit_logs")
}
```

---

## 5. Migration & Seed Data Strategy

1. **Migration Strategy (`Prisma Migrate`):**
   - Development: `npx prisma migrate dev --name <descriptive_name>` generates deterministic SQL migrations under `prisma/migrations/`.
   - Custom SQL Constraints: Raw SQL `CHECK` constraints (`quantity_on_hand >= quantity_reserved`, `base_price >= 0`, `rating BETWEEN 1 AND 5`) and PostgreSQL `tsvector` generated column + `GIN` index are appended to the initial migration SQL file so PostgreSQL enforces invariants even outside the ORM.
   - Production: `npx prisma migrate deploy` runs automatically in CI/CD before starting new application containers.
2. **Seed Data Strategy (`prisma/seed.ts`):**
   - **Idempotent `upsert` execution:** Running `npx prisma db seed` multiple times will not duplicate data.
   - **Seeded Entities:**
     - 4 Roles (`CUSTOMER`, `SUPPORT_AGENT`, `INVENTORY_MANAGER`, `SUPER_ADMIN`) + 24 granular permissions.
     - Default Accounts: `admin@techcart.com`, `inventory@techcart.com`, `support@techcart.com`, `customer@techcart.com`.
     - 6 Categories (`Audio & Headphones`, `Mechanical Keyboards`, `Smart Wearables`, `Displays & Monitors`, `Gaming Mice`, `Hubs & Accessories`).
     - 12+ Flagship Tech Products (including the 6 signature 360° Rotating Wheel products with Cloudinary URLs, rich JSON specifications, multiple `product_variants` for Color/Switch Type, and `inventory` rows with 20–100 units on hand).
     - 3 Active Vouchers (`WELCOME10`, `TECHSAVE25`, `FREESHIP`).
     - 6 Official `store_policies` records (`Shipping Policy`, `30-Day Return & Refund Policy`, `1-Year Hardware Warranty`, `Payment Security FAQ`, `Order Cancellation Rules`, `Compatibility Guide`) for the AI Shopping Assistant.

