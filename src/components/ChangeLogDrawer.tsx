import { Drawer, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ConfigChangeLog } from '@/types';
import { formatDateTime } from '@/utils/date';

interface ChangeLogDrawerProps {
  pairLabel?: string;
  logs: ConfigChangeLog[];
  open: boolean;
  onClose: () => void;
}

export default function ChangeLogDrawer({ pairLabel, logs, open, onClose }: ChangeLogDrawerProps) {
  const columns: ColumnsType<ConfigChangeLog> = [
    { title: '操作', dataIndex: 'action', width: 112 },
    { title: '改动点', dataIndex: 'detail' },
    {
      title: '改动时间',
      dataIndex: 'changedAt',
      width: 176,
      render: (value: string) => formatDateTime(value),
    },
    { title: '修改人', dataIndex: 'operator', width: 112 },
  ];

  return (
    <Drawer
      title={pairLabel ? `${pairLabel} 日志` : '日志'}
      width={640}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Table
        className="compact-table"
        size="middle"
        rowKey="id"
        columns={columns}
        dataSource={logs}
        pagination={false}
        locale={{ emptyText: '暂无修改记录' }}
      />
    </Drawer>
  );
}
