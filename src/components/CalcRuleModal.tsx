import { Descriptions, Modal, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DailyBar, EnrichedPair } from '@/types';
import { formatPercent, formatRate } from '@/utils/rateCalc';
import { tradingBars } from '@/mock/seed';

const { Paragraph } = Typography;

interface CalcRuleModalProps {
  pair: EnrichedPair | null;
  open: boolean;
  onClose: () => void;
}

export default function CalcRuleModal({ pair, open, onClose }: CalcRuleModalProps) {
  if (!pair) return null;

  const history = tradingBars(pair.history);

  const columns: ColumnsType<DailyBar> = [
    { title: '交易日期', dataIndex: 'date', width: 120 },
    {
      title: '开盘',
      dataIndex: 'open',
      align: 'right',
      render: (value: string) => formatRate(value, 4),
    },
    {
      title: '最高',
      dataIndex: 'high',
      align: 'right',
      render: (value: string) => formatRate(value, 4),
    },
    {
      title: '最低',
      dataIndex: 'low',
      align: 'right',
      render: (value: string) => formatRate(value, 4),
    },
    {
      title: '收盘',
      dataIndex: 'close',
      align: 'right',
      render: (value: string) => formatRate(value, 4),
    },
  ];

  return (
    <Modal
      title={`${pair.pairLabel} 计算规则`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
    >
      <Paragraph type="secondary">
        基础数据取最近 7 个交易日（{history[0]?.date} 至 {history[history.length - 1]?.date}）。
      </Paragraph>
      <Table
        rowKey="date"
        pagination={false}
        columns={columns}
        dataSource={history}
        style={{ marginBottom: 16 }}
      />
      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="最近7日平均汇率">{formatRate(pair.avg7, 4)}</Descriptions.Item>
        <Descriptions.Item label="综合缓冲因子">{formatPercent(pair.combinedBuffer)}</Descriptions.Item>
        <Descriptions.Item label="基准货币报价">{pair.quoteCcy1}（{pair.currency1}）</Descriptions.Item>
        <Descriptions.Item label="计价货币报价">{pair.quoteCcy2}（{pair.currency2}）</Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}
