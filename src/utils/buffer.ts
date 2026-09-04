import type { BufferConfig, FxPairState, OfficialQuote } from '@/types';
import { enabledSources } from '@/utils/source';

export function pairBufferOf(pair: Pick<FxPairState, 'volatilityBuffer' | 'fee'>): BufferConfig {
  return {
    volatilityBuffer: pair.volatilityBuffer,
    fee: pair.fee,
  };
}

export function applyGlobalBuffer<T extends Pick<FxPairState, 'volatilityBuffer' | 'fee'>>(
  pairs: T[],
  global: BufferConfig,
): T[] {
  return pairs.map((pair) => ({
    ...pair,
    volatilityBuffer: global.volatilityBuffer,
    fee: global.fee,
  }));
}

export function isCustomDayQuote(quote: Pick<OfficialQuote, 'bufferCustom'>): boolean {
  return Boolean(quote.bufferCustom);
}

export function customDayQuoteCount(quotes: OfficialQuote[], quoteDate?: string): number {
  return quotes.filter((quote) => (!quoteDate || quote.quoteDate === quoteDate) && quote.bufferCustom).length;
}

/** 当前报价日里仍有跟随全局默认、可被重算改写的货币对 */
export function openDayFollowerPairIds(
  pairs: Array<Pick<FxPairState, 'id' | 'enabled' | 'feeds'>>,
  quotes: OfficialQuote[],
  openDate?: string,
  pairIds?: string[],
): string[] {
  const customKeys = new Set(
    quotes
      .filter((quote) => (!openDate || quote.quoteDate === openDate) && quote.bufferCustom)
      .map((quote) => `${quote.pairId}:${quote.quoteSource}`),
  );
  return pairs
    .filter((pair) => {
      if (!pair.enabled || (pairIds && !pairIds.includes(pair.id))) return false;
      return enabledSources(pair).some((source) => !customKeys.has(`${pair.id}:${source}`));
    })
    .map((pair) => pair.id);
}
