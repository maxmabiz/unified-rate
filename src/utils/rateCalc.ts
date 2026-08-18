import Decimal from 'decimal.js';
import type { DailyBar, ComputedQuotes, BufferConfig } from '@/types';

Decimal.set({ precision: 28 });

export const VOLATILITY_THRESHOLD = new Decimal('0.01');
export const VOLATILITY_WARNING_TEXT = '市场汇率波动超过1%，请关注业务报价是否需要调整。';

export function dailyAverage(high: string | Decimal, low: string | Decimal): Decimal {
  return new Decimal(high).plus(low).div(2);
}

export function sevenDayAverage(dailyAvgs: Decimal[]): Decimal {
  if (dailyAvgs.length === 0) return new Decimal(0);
  const sum = dailyAvgs.reduce((acc, item) => acc.plus(item), new Decimal(0));
  return sum.div(dailyAvgs.length);
}

export function averageFromHistory(history: DailyBar[]): Decimal {
  return sevenDayAverage(history.map((bar) => dailyAverage(bar.high, bar.low)));
}

/** 向下保留 1 位小数（非四舍五入） */
export function floorTo1Decimal(value: Decimal): Decimal {
  return value.toDecimalPlaces(1, Decimal.ROUND_FLOOR);
}

/** 向上保留 1 位小数（非四舍五入） */
export function ceilTo1Decimal(value: Decimal): Decimal {
  return value.toDecimalPlaces(1, Decimal.ROUND_CEIL);
}

export function combinedBufferOf(config: BufferConfig): Decimal {
  return new Decimal(config.volatilityBuffer).plus(config.fee);
}

/** 客户结算币种为货币1：平均汇率 × (1 - 综合缓冲因子)，向下保留 1 位小数 */
export function quoteForCurrency1(avg7: Decimal, buffer: Decimal): Decimal {
  return floorTo1Decimal(avg7.mul(new Decimal(1).minus(buffer)));
}

/** 客户结算币种为货币2：平均汇率 × (1 + 综合缓冲因子)，向上保留 1 位小数 */
export function quoteForCurrency2(avg7: Decimal, buffer: Decimal): Decimal {
  return ceilTo1Decimal(avg7.mul(new Decimal(1).plus(buffer)));
}

export function computeQuotes(history: DailyBar[], config: BufferConfig): ComputedQuotes {
  const avg7 = averageFromHistory(history);
  const combined = combinedBufferOf(config);
  return {
    avg7: avg7.toFixed(4),
    combinedBuffer: combined.toFixed(4),
    quoteCcy1: quoteForCurrency1(avg7, combined).toFixed(1),
    quoteCcy2: quoteForCurrency2(avg7, combined).toFixed(1),
    hasVolatilityWarning: false,
  };
}

export function fluctuationRatio(current: string, previous: string): Decimal {
  const prev = new Decimal(previous);
  if (prev.isZero()) return new Decimal(0);
  return new Decimal(current).minus(prev).abs().div(prev);
}

export function hasVolatilityWarning(current: string, previous: string): boolean {
  return fluctuationRatio(current, previous).gte(VOLATILITY_THRESHOLD);
}

export function formatRate(value: string | Decimal, digits = 4): string {
  return new Decimal(value).toFixed(digits);
}

export function formatPercent(fraction: string | Decimal): string {
  const pct = new Decimal(fraction).mul(100);
  return `${pct.toDecimalPlaces(2).toString()}%`;
}

export function percentToFraction(percent: number | string): string {
  return new Decimal(percent).div(100).toFixed(6);
}

export function fractionToPercentNumber(fraction: string): number {
  return new Decimal(fraction).mul(100).toNumber();
}

export function rawQuoteForCurrency1(avg7: Decimal, buffer: Decimal): Decimal {
  return avg7.mul(new Decimal(1).minus(buffer));
}

export function rawQuoteForCurrency2(avg7: Decimal, buffer: Decimal): Decimal {
  return avg7.mul(new Decimal(1).plus(buffer));
}
