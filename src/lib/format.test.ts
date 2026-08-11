import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import { formatQuantity } from './format.js';

describe('formatQuantity', () => {
  it('formatuje liczbę całkowitą z decimalPlaces: 0', () => {
    expect(formatQuantity(new Decimal('3'), 0, 'szt')).toBe('3 szt');
  });

  it('formatuje gramy z decimalPlaces: 0', () => {
    expect(formatQuantity(new Decimal('200'), 0, 'g')).toBe('200 g');
  });

  it('formatuje mililitry z decimalPlaces: 0', () => {
    expect(formatQuantity(new Decimal('150'), 0, 'ml')).toBe('150 ml');
  });

  it('zaokrągla w dół przy decimalPlaces: 0', () => {
    expect(formatQuantity(new Decimal('2.4'), 0, 'g')).toBe('2 g');
  });

  it('zaokrągla w górę przy decimalPlaces: 0', () => {
    expect(formatQuantity(new Decimal('2.6'), 0, 'g')).toBe('3 g');
  });

  it('zachowuje 1 miejsce po przecinku przy decimalPlaces: 1', () => {
    expect(formatQuantity(new Decimal('2.5'), 1, 'szt')).toBe('2.5 szt');
  });

  it('wypisuje .0 gdy decimalPlaces: 1 i liczba całkowita', () => {
    expect(formatQuantity(new Decimal('3'), 1, 'szt')).toBe('3.0 szt');
  });
});
