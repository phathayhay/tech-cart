import assert from 'assert'
import {
  addMoney,
  subMoney,
  mulMoney,
  percentageOfMoney,
  allocateDiscountProRata,
  formatMoneyVND
} from '../../src/common/utils/money.util'

export function runMoneyUnitTests(): void {
  // 1. VND exact integer rounding
  assert.strictEqual(addMoney('1590000', '410000', 'VND').toFixed(0), '2000000')
  assert.strictEqual(subMoney('2500000', '500000', 'VND').toFixed(0), '2000000')
  assert.strictEqual(mulMoney('399000', 3, 'VND').toFixed(0), '1197000')

  // 2. Percentage discount in VND
  assert.strictEqual(percentageOfMoney('2990000', 10, 'VND').toFixed(0), '299000')
  assert.strictEqual(percentageOfMoney('333333', 10, 'VND').toFixed(0), '33333')

  // 3. Pro-rata line item discount allocation where sum of allocations === totalDiscount
  const allocations = allocateDiscountProRata(['100000', '100000', '100000'], '10000', 'VND')
  assert.strictEqual(allocations.length, 3)
  assert.strictEqual(allocations[0].toFixed(0), '3333')
  assert.strictEqual(allocations[1].toFixed(0), '3333')
  assert.strictEqual(allocations[2].toFixed(0), '3334') // Remainder assigned to last item
  const sum = allocations.reduce((acc, v) => acc.plus(v), addMoney(0, 0, 'VND'))
  assert.strictEqual(sum.toFixed(0), '10000')

  // 4. VND formatter check
  const formatted = formatMoneyVND(2990000)
  assert.ok(formatted.includes('2.990.000'))
  console.log('PASS: All money.util.spec.ts unit tests passed (VND & Pro-Rata math)')
}

if (require.main === module) {
  runMoneyUnitTests()
}

