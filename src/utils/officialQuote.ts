import dayjs from 'dayjs';
import { HISTORY_CALENDAR_DAYS, INITIAL_CALCULATED_AT, INITIAL_DATA_DATE } from '@/constants';
import type { BufferConfig, DailyBar, FxPairState, OfficialQuote } from '@/types';
import { pairBufferOf } from '@/utils/buffer';
import { isTradingDay, lastNCalendarDays, latestTradingDay, tradingBars } from '@/utils/date';
import { computeQuotes } from '@/utils/rateCalc';
import { quoteFeed, quoteHistory } from '@/utils/source';

export function quoteWindow(history: DailyBar[], quoteDate: string, count = 7): DailyBar[] {
  return tradingBars(
    history.filter((bar) => bar.date <= quoteDate),
    count,
  );
}

export function quoteWindowLabel(history: DailyBar[]): string {
  if (!history.length) return '-';
  const start = history[0].date;
  const end = history[history.length - 1].date;
  return `${start} 至 ${end}`;
}

export function buildOfficialQuote(
  pair: FxPairState,
  quoteDate: string,
  calculatedAt: string,
  buffer?: BufferConfig,
  bufferCustom = false,
): OfficialQuote {
  const config = buffer ?? pairBufferOf(pair);
  const history = quoteWindow(quoteHistory(pair), quoteDate);
  const quotes = computeQuotes(history, config);
  return {
    id: `${pair.id}-${quoteDate}`,
    pairId: pair.id,
    currency1: pair.currency1,
    currency2: pair.currency2,
    pair: pair.pair,
    pairLabel: pair.pairLabel,
    quoteDate,
    quoteSource: pair.quoteSource,
    avg7: quotes.avg7,
    combinedBuffer: quotes.combinedBuffer,
    volatilityBuffer: config.volatilityBuffer,
    fee: config.fee,
    quoteCcy1: quotes.quoteCcy1,
    quoteCcy2: quotes.quoteCcy2,
    calculatedAt,
    history,
    bufferCustom,
  };
}

export function openQuoteDate(pairs: FxPairState[]): string | undefined {
  let latest: string | undefined;
  for (const pair of pairs.filter((item) => item.enabled)) {
    const dataDate = quoteFeed(pair).dataDate;
    if (dataDate && (!latest || dataDate > latest)) {
      latest = dataDate;
    }
  }
  if (!latest) return undefined;
  return latestTradingDay(dayjs(latest));
}

export function latestQuoteDate(quotes: OfficialQuote[]): string | undefined {
  if (!quotes.length) return undefined;
  return quotes.reduce((max, quote) => (quote.quoteDate > max ? quote.quoteDate : max), quotes[0].quoteDate);
}

export function firstQuoteDate(quotes: OfficialQuote[], pairId: string): string | undefined {
  let earliest: string | undefined;
  for (const quote of quotes) {
    if (quote.pairId !== pairId) continue;
    if (!earliest || quote.quoteDate < earliest) {
      earliest = quote.quoteDate;
    }
  }
  return earliest;
}

export function isQuoteLocked(quoteDate: string, unlockedDate: string | undefined): boolean {
  if (!unlockedDate) return true;
  return quoteDate < unlockedDate;
}

function compareQuotes(a: OfficialQuote, b: OfficialQuote): number {
  return b.quoteDate.localeCompare(a.quoteDate) || a.pair.localeCompare(b.pair);
}

export function sortOfficialQuotes(quotes: OfficialQuote[]): OfficialQuote[] {
  return [...quotes].sort(compareQuotes);
}

export function upsertQuote(quotes: OfficialQuote[], next: OfficialQuote): OfficialQuote[] {
  return sortOfficialQuotes([...quotes.filter((quote) => quote.id !== next.id), next]);
}

export function rebuildOpenDayQuotes(
  pairs: FxPairState[],
  quotes: OfficialQuote[],
  calculatedAt: string,
  pairIds?: string[],
  globalBuffer?: BufferConfig,
  skipCustom = false,
): OfficialQuote[] {
  const unlocked = openQuoteDate(pairs);
  if (!unlocked) return quotes;

  const targets = pairs.filter((pair) => pair.enabled && (!pairIds || pairIds.includes(pair.id)));
  let next = quotes;
  for (const pair of targets) {
    const existing = next.find((quote) => quote.pairId === pair.id && quote.quoteDate === unlocked);
    if (skipCustom && existing?.bufferCustom) continue;
    next = upsertQuote(next, buildOfficialQuote(pair, unlocked, calculatedAt, globalBuffer, false));
  }
  return next;
}

export function seedOfficialQuotes(
  pairs: FxPairState[],
  windowEnd = INITIAL_DATA_DATE,
  calendarDays = HISTORY_CALENDAR_DAYS,
): OfficialQuote[] {
  const dates = lastNCalendarDays(windowEnd, calendarDays).filter((date) => isTradingDay(date));
  const quotes: OfficialQuote[] = [];
  for (const pair of pairs.filter((item) => item.enabled)) {
    for (const date of dates) {
      const calculatedAt = date === windowEnd ? INITIAL_CALCULATED_AT : `${date} 06:02:06`;
      quotes.push(buildOfficialQuote(pair, date, calculatedAt));
    }
  }
  return sortOfficialQuotes(quotes);
}
