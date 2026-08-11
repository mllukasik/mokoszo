import Decimal from 'decimal.js';

/**
 * Formatuje ilość do wyświetlenia w UI.
 * @example formatQuantity(new Decimal('2.5'), 1, 'szt') → "2.5 szt"
 * @example formatQuantity(new Decimal('200'), 0, 'g')   → "200 g"
 */
export function formatQuantity(
  value: Decimal,
  decimalPlaces: number,
  unitSymbol: string
): string {
  return `${value.toDecimalPlaces(decimalPlaces).toFixed(decimalPlaces)} ${unitSymbol}`;
}
