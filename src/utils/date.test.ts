import { describe, expect, it } from 'vitest';
import { lastNCalendarDays, formatSyncRange, tradingDaysInRange } from './date';

describe('同步时间段', () => {
  it('单日时间段仅包含当天交易日', () => {
    expect(tradingDaysInRange('2026-08-07', '2026-08-07')).toEqual(['2026-08-07']);
  });

  it('跨周末时跳过非交易日', () => {
    expect(tradingDaysInRange('2026-08-07', '2026-08-10')).toEqual([
      '2026-08-07',
      '2026-08-10',
    ]);
  });

  it('纯周末时间段没有交易日', () => {
    expect(tradingDaysInRange('2026-08-08', '2026-08-09')).toEqual([]);
  });

  it('起止同一天展示为全天', () => {
    expect(formatSyncRange('2026-08-17', '2026-08-17')).toBe('2026-08-17（全天）');
    expect(formatSyncRange('2026-08-14', '2026-08-17')).toBe('2026-08-14 至 2026-08-17');
  });

  it('最近10个自然日包含今天 2026-08-18', () => {
    expect(lastNCalendarDays('2026-08-18', 10)).toEqual([
      '2026-08-09',
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-15',
      '2026-08-16',
      '2026-08-17',
      '2026-08-18',
    ]);
  });
});
