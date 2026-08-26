import { describe, expect, it } from 'vitest';
import { quoteSourceChangeDetail } from '@/utils/source';

describe('数据源文案', () => {
  it('更改报价数据源记录从哪一路改到哪一路', () => {
    expect(quoteSourceChangeDetail('reuters', 'investing')).toBe('报价数据源由 Reuters 改为 英为财经');
    expect(quoteSourceChangeDetail('investing', 'reuters')).toBe('报价数据源由 英为财经 改为 Reuters');
  });
});
