import { Drawer, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DailyBar } from '@/types';
import { averageFromHistory, dailyAverage, formatRate } from '@/utils/rateCalc';

const { Text, Paragraph } = Typography;

interface HistoryDrawerProps {
  pairLabel?: string;
  history: DailyBar[];
  open: boolean;
  onClose: () => void;
}

export default function HistoryDrawer({ pairLabel, history, open, onClose }: HistoryDrawerProps) {
  const columns: ColumnsType<DailyBar> = [
    {
      title: '交易日期',
      dataIndex: 'date',
      width: 120,
    },
    {
      title: '开盘 Open',
      dataIndex: 'open',
      render: (value: string) => <span className="num-cell">{formatRate(value, 4)}</span>,
    },
    {
      title: '最高 High',
      dataIndex: 'high',
      render: (value: string) => <span className="num-cell">{formatRate(value, 4)}</span>,
    },
    {
      title: '最低 Low',
      dataIndex: 'low',
      render: (value: string) => <span className="num-cell">{formatRate(value, 4)}</span>,
    },
    {
      title: '收盘 Close',
      dataIndex: 'close',
      render: (value: string) => <span className="num-cell">{formatRate(value, 4)}</span>,
    },
    {
      title: '当日平均',
      key: 'avg',
      render: (_, record) => (
        <span className="num-cell">{formatRate(dailyAverage(record.high, record.low), 4)}</span>
      ),
    },
  ];

  const avg7 = history.length > 0 ? averageFromHistory(history).toFixed(4) : '-';

  return (
    <Drawer
      title={pairLabel ? `${pairLabel} 近7日数据` : '近7日数据'}
      width={880}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Paragraph type="secondary" style={{ marginTop: 0 }}>
        单日平均汇率 =（当日最高汇率 + 当日最低汇率）÷ 2
      </Paragraph>
      <Table
        rowKey="date"
        pagination={false}
        columns={columns}
        dataSource={history}
      />
      <div style={{ marginTop: 16, padding: '12px 16px', background: '#fafafa', border: '1px solid #f0f0f0' }}>
        <Text>最近7日平均汇率 = 最近7个交易日「单日平均汇率」的平均值</Text>
        <div style={{ marginTop: 8 }}>
          <Text type="secondary">最近7日平均汇率：</Text>
          <Text strong className="num-cell" style={{ fontSize: 18, marginLeft: 8 }}>
            {avg7 === '-' ? '-' : formatRate(avg7, 4)}
          </Text>
        </div>
      </div>
    </Drawer>
  );
}
