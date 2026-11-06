import Decimal from 'decimal.js'

// Configure Decimal for commercial half-up rounding
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP
})

export type MoneyInput = Decimal | number | string

export type SupportedCurrency = 'VND' | 'USD'

/**
 * Number of decimal places for final currency rounding:
 * - VND uses 0 fractional digits (rounded to nearest integer Dong, stored in DECIMAL(15,2) as X.00)
 * - USD uses 2 fractional digits
 */
export function getCurrencyScale(currency: SupportedCurrency = 'VND'): number {
  return currency === 'VND' ? 0 : 2
}

export function toDecimal(value: MoneyInput): Decimal {
  if (value instanceof Decimal) {
    return value
  }
  return new Decimal(value || 0)
}

export function roundMoney(value: MoneyInput, currency: SupportedCurrency = 'VND'): Decimal {
  const scale = getCurrencyScale(currency)
  return toDecimal(value).toDecimalPlaces(scale, Decimal.ROUND_HALF_UP)
}

export function addMoney(a: MoneyInput, b: MoneyInput, currency: SupportedCurrency = 'VND'): Decimal {
  return roundMoney(toDecimal(a).plus(toDecimal(b)), currency)
}

export function subMoney(a: MoneyInput, b: MoneyInput, currency: SupportedCurrency = 'VND'): Decimal {
  return roundMoney(toDecimal(a).minus(toDecimal(b)), currency)
}

export function clampZeroMoney(value: MoneyInput, currency: SupportedCurrency = 'VND'): Decimal {
  const dec = roundMoney(value, currency)
  return dec.isNegative() ? new Decimal(0) : dec
}

export function mulMoney(amount: MoneyInput, multiplier: MoneyInput, currency: SupportedCurrency = 'VND'): Decimal {
  return roundMoney(toDecimal(amount).times(toDecimal(multiplier)), currency)
}

export function percentageOfMoney(
  amount: MoneyInput,
  percent: MoneyInput,
  currency: SupportedCurrency = 'VND'
): Decimal {
  return roundMoney(toDecimal(amount).times(toDecimal(percent)).dividedBy(100), currency)
}

/**
 * Allocates a total discount across line items proportionally (pro-rata),
 * assigning any rounding remainder to the final item so sum(allocations) === totalDiscount.
 */
export function allocateDiscountProRata(
  lineSubtotals: MoneyInput[],
  totalDiscount: MoneyInput,
  currency: SupportedCurrency = 'VND'
): Decimal[] {
  const discountDec = roundMoney(totalDiscount, currency)
  if (lineSubtotals.length === 0) return []
  if (discountDec.lte(0)) {
    return lineSubtotals.map(() => new Decimal(0))
  }

  const subtotals = lineSubtotals.map((s) => roundMoney(s, currency))
  const orderSubtotal = subtotals.reduce((acc, item) => acc.plus(item), new Decimal(0))

  if (orderSubtotal.lte(0)) {
    return lineSubtotals.map(() => new Decimal(0))
  }

  const allocations: Decimal[] = []
  let allocatedSum = new Decimal(0)

  for (let i = 0; i < subtotals.length; i++) {
    if (i === subtotals.length - 1) {
      // Remainder goes to the last line item
      const remainder = clampZeroMoney(discountDec.minus(allocatedSum), currency)
      allocations.push(remainder)
    } else {
      const share = roundMoney(discountDec.times(subtotals[i]).dividedBy(orderSubtotal), currency)
      allocations.push(share)
      allocatedSum = allocatedSum.plus(share)
    }
  }

  return allocations
}

export function formatMoneyVND(value: MoneyInput): string {
  const rounded = roundMoney(value, 'VND').toNumber()
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(rounded)
}

