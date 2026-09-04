import { RATE_SOURCE_LABEL } from '@/constants';
import { RATE_SOURCE_IDS, type DailyBar, type FxPairState, type RateSource, type SourceFeed } from '@/types';

export function quoteFeed(pair: Pick<FxPairState, 'feeds' | 'quoteSource'>): SourceFeed {
  return pair.feeds[pair.quoteSource];
}

export function quoteHistory(pair: Pick<FxPairState, 'feeds' | 'quoteSource'>): DailyBar[] {
  return quoteFeed(pair).history;
}

export function sourceHistory(pair: Pick<FxPairState, 'feeds'>, source: RateSource): DailyBar[] {
  return pair.feeds[source].history;
}

export function connectedSources(pair: Pick<FxPairState, 'feeds'>): RateSource[] {
  return RATE_SOURCE_IDS.filter((source) => pair.feeds[source].connected);
}

export function enabledSources(pair: Pick<FxPairState, 'feeds'>): RateSource[] {
  return RATE_SOURCE_IDS.filter((source) => pair.feeds[source].connected && pair.feeds[source].enabled);
}

export function pairOptionsForSource(
  pairs: Array<Pick<FxPairState, 'pair' | 'pairLabel' | 'feeds'>>,
  source?: RateSource,
): Array<{ value: string; label: string }> {
  const seen = new Map<string, string>();
  for (const pair of pairs) {
    if (source && !pair.feeds[source].connected) continue;
    seen.set(pair.pair, pair.pairLabel);
  }
  return [...seen.entries()].map(([value, label]) => ({ value, label }));
}

export function quoteSourceChangeDetail(from: RateSource, to: RateSource): string {
  return `报价数据源由 ${RATE_SOURCE_LABEL[from]} 改为 ${RATE_SOURCE_LABEL[to]}`;
}
