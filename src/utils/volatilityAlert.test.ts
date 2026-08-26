import { describe, expect, it } from 'vitest';
import { formatLatestVolatilityAlert, latestTradingDayWarnings, type VolatilityAlertInput } from './volatilityAlert';

function row(overrides: Partial<VolatilityAlertInput> & Pick<VolatilityAlertInput, 'dataDate'>): VolatilityAlertInput {
  return {
    pair: 'GBPCNY',
    pairLabel: 'GBP/CNY',
    source: 'reuters',
    changeRatio: '0.012',
    hasVolatilityWarning: false,
    ...overrides,
  };
}

describe('最新交易日波动提醒', () => {
  it('最新交易日没有超 1% 时不提醒，即使更早有跳点', () => {
    const warnings = latestTradingDayWarnings([
      row({ dataDate: '2026-08-14', hasVolatilityWarning: true }),
      row({ dataDate: '2026-08-18', pair: 'USDCNY', pairLabel: 'USD/CNY', changeRatio: '0.001', hasVolatilityWarning: false }),
    ]);
    expect(warnings).toEqual([]);
    expect(formatLatestVolatilityAlert(warnings)).toBe('');
  });

  it('只统计最新交易日，周末复制收盘不顶替交易日', () => {
    const warnings = latestTradingDayWarnings([
      row({ dataDate: '2026-08-14', hasVolatilityWarning: true, changeRatio: '0.012' }),
      row({ dataDate: '2026-08-15', hasVolatilityWarning: false, changeRatio: '0' }),
      row({ dataDate: '2026-08-16', hasVolatilityWarning: false, changeRatio: '0' }),
    ]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].dataDate).toBe('2026-08-14');
  });

  it('同一天两路来源都超阈值时一并列出', () => {
    const warnings = latestTradingDayWarnings([
      row({
        dataDate: '2026-08-18',
        source: 'investing',
        changeRatio: '0.0121',
        hasVolatilityWarning: true,
      }),
      row({
        dataDate: '2026-08-18',
        source: 'reuters',
        changeRatio: '0.012',
        hasVolatilityWarning: true,
      }),
      row({
        dataDate: '2026-08-18',
        pair: 'USDCNY',
        pairLabel: 'USD/CNY',
        changeRatio: '0.001',
        hasVolatilityWarning: false,
      }),
    ]);
    expect(formatLatestVolatilityAlert(warnings)).toBe(
      '2026-08-18 有 2 条行情波动超过 1%：GBP/CNY Reuters +1.20%、GBP/CNY 英为财经 +1.21%。',
    );
  });
});
