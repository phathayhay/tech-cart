import assert from 'assert'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function runPrismaSchemaIntegrationTest(): Promise<void> {
  console.log('🧪 [Test] Running Phase 2 Prisma Schema, Constraints & Seed Integration Test...')

  // 1. Verify Roles & Permissions count
  const rolesCount = await prisma.role.count()
  const permsCount = await prisma.permission.count()
  assert.strictEqual(rolesCount, 4, `Expected 4 roles, got ${rolesCount}`)
  assert.ok(permsCount >= 22, `Expected >= 22 permissions, got ${permsCount}`)

  // 2. Verify Flagship Products & VND Decimal Prices
  const wheelProducts = await prisma.product.findMany({
    where: { isFeaturedOnWheel: true },
    orderBy: { wheelSortOrder: 'asc' },
    include: { variants: { include: { inventory: true } }, images: true }
  })
  assert.strictEqual(wheelProducts.length, 6, `Expected 6 featured wheel products, got ${wheelProducts.length}`)

  const sony = wheelProducts[0]
  assert.strictEqual(sony.currencyCode, 'VND')
  assert.strictEqual(sony.basePrice.toFixed(2), '6990000.00')
  assert.ok(sony.variants.length >= 2, 'Expected at least 2 variants per product')
  assert.ok(sony.variants[0].inventory!.quantityOnHand > 0, 'Expected positive stock on hand')

  // 3. Verify PostgreSQL CHECK constraint blocks overselling (quantity_reserved > quantity_on_hand)
  const testVariantInv = sony.variants[0].inventory!
  let constraintBlocked = false
  try {
    await prisma.$executeRaw`
      UPDATE inventory
      SET quantity_reserved = quantity_on_hand + 10
      WHERE id = ${testVariantInv.id}::uuid
    `
  } catch (err: any) {
    constraintBlocked = true
    assert.ok(
      String(err.message).includes('chk_inventory_non_negative') || String(err.message).includes('23514'),
      `Expected CHECK constraint error, got: ${err.message}`
    )
  }
  assert.strictEqual(constraintBlocked, true, 'PostgreSQL CHECK constraint chk_inventory_non_negative MUST block overselling!')

  // 4. Verify Vouchers & Store Policies for AI Assistant
  const voucherCount = await prisma.voucher.count({ where: { isActive: true } })
  const policyCount = await prisma.storePolicy.count({ where: { isActive: true } })
  assert.ok(voucherCount >= 3, 'Expected >= 3 active vouchers')
  assert.ok(policyCount >= 5, 'Expected >= 5 active store policies for AI grounding')

  console.log('PASS: All Phase 2 Prisma Schema, VND Seed & DB CHECK Constraint tests passed!')
}

if (require.main === module) {
  runPrismaSchemaIntegrationTest()
    .catch((err) => {
      console.error('FAIL:', err)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
