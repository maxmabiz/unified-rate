import { CURRENT_OPERATOR } from '@/constants';
import type { ConfigChangeLog } from '@/types';

export function pairStatusChangeDetail(enabled: boolean): string {
  return enabled ? '状态由停用改为启用' : '状态由启用改为停用';
}

export function pairStatusChangeAction(enabled: boolean): string {
  return enabled ? '启用' : '停用';
}

export function buildChangeLog(input: {
  id?: string;
  pairId: string;
  pairLabel: string;
  action: string;
  detail: string;
  changedAt: string;
  operator?: string;
}): ConfigChangeLog {
  const stamp = input.changedAt.replace(/\D/g, '');
  return {
    id: input.id ?? `cl-${input.pairId}-${stamp}-${Date.now().toString(36)}`,
    pairId: input.pairId,
    pairLabel: input.pairLabel,
    action: input.action,
    detail: input.detail,
    changedAt: input.changedAt,
    operator: input.operator ?? CURRENT_OPERATOR,
  };
}

export function sortChangeLogs(logs: ConfigChangeLog[]): ConfigChangeLog[] {
  return [...logs].sort((a, b) => b.changedAt.localeCompare(a.changedAt) || b.id.localeCompare(a.id));
}
