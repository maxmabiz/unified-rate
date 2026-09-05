import { Tag, Tooltip } from 'antd';
import { RATE_SOURCE_LABEL } from '@/constants';
import type { RateSource } from '@/types';

export function WarningTag() {
  return <Tag color="warning">波动预警</Tag>;
}

export function SourceTag({ source }: { source: RateSource }) {
  return <Tag>{RATE_SOURCE_LABEL[source]}</Tag>;
}

export function EnabledTag({ enabled }: { enabled: boolean }) {
  return enabled ? <Tag color="success">启用</Tag> : <Tag>停用</Tag>;
}

export function EffectiveTag() {
  return <Tag color="success">有效</Tag>;
}

export function LockedTag() {
  return <Tag>已锁定</Tag>;
}

export function CustomBufferTag({ onClick }: { onClick?: () => void }) {
  return (
    <Tooltip title="当天已单独配置，重新计算不会覆盖">
      <Tag
        color="processing"
        className={onClick ? 'buffer-custom-tag is-clickable' : 'buffer-custom-tag'}
        onClick={onClick}
      >
        已改
      </Tag>
    </Tooltip>
  );
}

