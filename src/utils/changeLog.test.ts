import { describe, expect, it } from 'vitest';
import { CURRENT_OPERATOR } from '@/constants';
import { createInitialSnapshot } from '@/mock/seed';
import {
  buildChangeLog,
  pairStatusChangeAction,
  pairStatusChangeDetail,
  sortChangeLogs,
} from '@/utils/changeLog';
import { quoteSourceChangeDetail } from '@/utils/source';

describe('配置变更日志', () => {
  it('启用停用记录状态从哪改到哪', () => {
    expect(pairStatusChangeAction(true)).toBe('启用');
    expect(pairStatusChangeAction(false)).toBe('停用');
    expect(pairStatusChangeDetail(true)).toBe('状态由停用改为启用');
    expect(pairStatusChangeDetail(false)).toBe('状态由启用改为停用');
  });

  it('初始快照按时间倒序提供数据源和启用停用日志', () => {
    const snapshot = createInitialSnapshot();
    expect(snapshot.changeLogs.length).toBeGreaterThan(0);
    expect(snapshot.changeLogs).toEqual(sortChangeLogs(snapshot.changeLogs));
    expect(snapshot.changeLogs.some((log) => log.action === '更改数据源')).toBe(true);
    expect(snapshot.changeLogs.some((log) => log.action === '启用')).toBe(true);
    expect(snapshot.changeLogs.some((log) => log.action === '停用')).toBe(true);
    expect(snapshot.changeLogs.filter((log) => log.pairId === 'USDCNY').length).toBeGreaterThan(0);
  });

  it('新日志默认记当前操作人', () => {
    const log = buildChangeLog({
      pairId: 'USDCNY',
      pairLabel: 'USD/CNY',
      action: '更改数据源',
      detail: quoteSourceChangeDetail('reuters', 'investing'),
      changedAt: '2026-08-18 12:00:00',
    });
    expect(log.operator).toBe(CURRENT_OPERATOR);
    expect(log.detail).toBe('报价数据源由 Reuters 改为 英为财经');
  });
});
