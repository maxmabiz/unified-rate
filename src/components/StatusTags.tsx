import { Space, Tag } from 'antd';
import type { SyncStatus } from '@/types';

const SYNC_COLOR: Record<SyncStatus, string> = {
  正常: 'success',
  同步中: 'processing',
  失败: 'error',
};

export function SyncStatusTag({ status }: { status: SyncStatus }) {
  return <Tag color={SYNC_COLOR[status]}>{status}</Tag>;
}

export function WarningTag() {
  return <Tag color="warning">波动预警</Tag>;
}

export function EnabledTag({ enabled }: { enabled: boolean }) {
  return enabled ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>;
}

export function EffectiveTag({ warning }: { warning?: boolean }) {
  return (
    <Space size={4} wrap>
      <Tag color="success">有效</Tag>
      {warning ? <WarningTag /> : null}
    </Space>
  );
}

