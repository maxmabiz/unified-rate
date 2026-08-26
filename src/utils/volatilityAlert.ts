import { RATE_SOURCE_LABEL } from '@/constants';
import { RATE_SOURCE_IDS, type RateDailyRow } from '@/types';
import { isTradingDay } from '@/utils/date';
import { formatSignedPercent } from '@/utils/rateCalc';

export type VolatilityAlertInput = Pick<
  RateDailyRow,
  'dataDate' | 'pair' | 'pairLabel' | 'source' | 'changeRatio' | 'hasVolatilityWarning'
>;

/** 只取最新交易日里超过 1% 的行情；周末复制收盘和更早的跳点不进横幅 */
export function latestTradingDayWarnings(rows: VolatilityAlertInput[]): VolatilityAlertInput[] {
  let latest: string | undefined;
  for (const row of rows) {
    if (!isTradingDay(row.dataDate)) continue;
    if (!latest || row.dataDate > latest) latest = row.dataDate;
  }
  if (!latest) return [];
  return rows
    .filter((row) => row.dataDate === latest && row.hasVolatilityWarning)
    .sort((a, b) => {
      const pairCmp = a.pair.localeCompare(b.pair);
      if (pairCmp !== 0) return pairCmp;
      return RATE_SOURCE_IDS.indexOf(a.source) - RATE_SOURCE_IDS.indexOf(b.source);
    });
}

export function formatLatestVolatilityAlert(rows: VolatilityAlertInput[]): string {
  if (rows.length === 0) return '';
  const items = rows.map(
    (row) => `${row.pairLabel} ${RATE_SOURCE_LABEL[row.source]} ${formatSignedPercent(row.changeRatio)}`,
  );
  return `${rows[0].dataDate} 有 ${rows.length} 条行情波动超过 1%：${items.join('、')}。`;
}
