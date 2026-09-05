import { describe, expect, it } from 'vitest';
import { createInitialSnapshot } from '@/mock/seed';
import {
  applySourceEnabled,
  enabledSources,
  flattenPairSourceRows,
  pairOptionsForSource,
  quoteSourceChangeDetail,
} from '@/utils/source';

describe('数据源文案', () => {
  it('更改报价数据源记录从哪一路改到哪一路', () => {
    expect(quoteSourceChangeDetail('reuters', 'investing')).toBe('报价数据源由 Reuters 改为 英为财经');
    expect(quoteSourceChangeDetail('investing', 'reuters')).toBe('报价数据源由 英为财经 改为 Reuters');
  });
});

describe('货币对与数据源', () => {
  it('已接入且启用的数据源都会出报价', () => {
    const snapshot = createInitialSnapshot();
    expect(enabledSources(snapshot.pairs[0])).toEqual(['reuters', 'investing']);
  });

  it('货币对选项可按数据来源收窄', () => {
    const snapshot = createInitialSnapshot();
    const all = pairOptionsForSource(snapshot.pairs);
    const reuters = pairOptionsForSource(snapshot.pairs, 'reuters');
    expect(all).toHaveLength(snapshot.pairs.length);
    expect(reuters).toHaveLength(snapshot.pairs.length);
  });

  it('配置列表按货币对 × 已接入数据源展开', () => {
    const snapshot = createInitialSnapshot();
    const rows = flattenPairSourceRows(snapshot.pairs);
    const usd = rows.filter((row) => row.pair === 'USDCNY');

    expect(rows).toHaveLength(snapshot.pairs.length * 2);
    expect(usd.map((row) => row.source)).toEqual(['reuters', 'investing']);
    expect(usd[0]).toMatchObject({
      pairLabel: 'USD/CNY',
      source: 'reuters',
      sourceCode: 'USDCNY=',
      enabled: true,
    });
    expect(usd[1].sourceCode).toBe('usd-cny');
  });

  it('启停只改这一路数据源，不影响另一路', () => {
    const snapshot = createInitialSnapshot();
    const pair = snapshot.pairs.find((item) => item.id === 'USDCNY');
    expect(pair).toBeDefined();
    const next = applySourceEnabled(pair!, 'reuters', false, '2026-08-18 12:00:00');

    expect(next.feeds.reuters.enabled).toBe(false);
    expect(next.feeds.investing.enabled).toBe(true);
    expect(next.enabled).toBe(true);
    expect(enabledSources(next)).toEqual(['investing']);

    const bothOff = applySourceEnabled(next, 'investing', false, '2026-08-18 12:01:00');
    expect(bothOff.enabled).toBe(false);
    expect(enabledSources(bothOff)).toEqual([]);
  });
});
