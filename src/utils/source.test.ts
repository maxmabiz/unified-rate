import { describe, expect, it } from 'vitest';
import { createInitialSnapshot } from '@/mock/seed';
import { enabledSources, pairOptionsForSource, quoteSourceChangeDetail } from '@/utils/source';

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
});
