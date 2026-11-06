-- ============================================================================
-- TechCart Pro — Custom PostgreSQL CHECK Constraints & Full-Text Search Index
-- Applied automatically after Prisma schema migration (TASK-011)
-- ============================================================================

-- 1. Inventory Invariant Constraints (Prevent negative stock & overselling at DB engine level)
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS chk_inventory_non_negative;
ALTER TABLE inventory ADD CONSTRAINT chk_inventory_non_negative
  CHECK (quantity_on_hand >= 0 AND quantity_reserved >= 0 AND quantity_on_hand >= quantity_reserved);

-- 2. Product & Variant Price Constraints
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_products_price_positive;
ALTER TABLE products ADD CONSTRAINT chk_products_price_positive
  CHECK (base_price >= 0 AND (compare_at_price IS NULL OR compare_at_price >= base_price));

ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS chk_variants_price_positive;
ALTER TABLE product_variants ADD CONSTRAINT chk_variants_price_positive
  CHECK (price >= 0 AND (compare_at_price IS NULL OR compare_at_price >= price));

-- 3. Cart Item Quantity Constraints
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS chk_cart_items_qty_range;
ALTER TABLE cart_items ADD CONSTRAINT chk_cart_items_qty_range
  CHECK (quantity > 0 AND quantity <= 50);

-- 4. Order Financial Non-Negative Constraints
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_amounts_non_negative;
ALTER TABLE orders ADD CONSTRAINT chk_orders_amounts_non_negative
  CHECK (subtotal >= 0 AND discount_amount >= 0 AND shipping_fee >= 0 AND tax_amount >= 0 AND grand_total >= 0);

-- 5. Review Rating Constraint (1 to 5 Stars)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS chk_reviews_rating_range;
ALTER TABLE reviews ADD CONSTRAINT chk_reviews_rating_range
  CHECK (rating >= 1 AND rating <= 5);

-- 6. PostgreSQL Full-Text Search (tsvector + GIN Index) on Products
CREATE INDEX IF NOT EXISTS idx_products_fts_gin ON products
  USING GIN (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(short_description, '')));

