import { Descriptions, Modal, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DailyBar, OfficialQuote } from '@/types';
import { RATE_SOURCE_LABEL } from '@/constants';
import { quoteWindowLabel } from '@/utils/officialQuote';
import { formatPercent, formatRate } from '@/utils/rateCalc';

const { Paragraph } = Typography;

interface CalcRuleModalProps {
  quote: OfficialQuote | null;
  open: boolean;
  onClose: () => void;
}

export default function CalcRuleModal({ quote, open, onClose }: CalcRuleModalProps) {
  if (!quote) return null;

  const history = quote.history;

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
      title={`${quote.pairLabel} 计算规则`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
    >
      <Paragraph type="secondary">
        基础数据取自{RATE_SOURCE_LABEL[quote.quoteSource]}截至 {quote.quoteDate} 的最近 7 个交易日（{quoteWindowLabel(history)}）。
      </Paragraph>
      <Table
        rowKey="date"
        pagination={false}
        columns={columns}
        dataSource={history}
        style={{ marginBottom: 16 }}
      />
      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="最近7日平均汇率">{formatRate(quote.avg7, 4)}</Descriptions.Item>
        <Descriptions.Item label="综合缓冲因子">{formatPercent(quote.combinedBuffer)}</Descriptions.Item>
        <Descriptions.Item label="基准货币报价">{quote.quoteCcy1}（{quote.currency1}）</Descriptions.Item>
        <Descriptions.Item label="计价货币报价">{quote.quoteCcy2}（{quote.currency2}）</Descriptions.Item>
      </Descriptions>
    </Modal>
  );
}
