import { useMemo, useState } from 'react';
import { Button, Card, DatePicker, Form, Select, Space, Table, Tooltip, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { RATE_SOURCE_LABEL } from '@/constants';
import HistoryDrawer from '@/components/HistoryDrawer';
import { SourceTag, WarningTag } from '@/components/StatusTags';
import { useRateStore } from '@/store/RateStore';
import { RATE_SOURCE_IDS, type RateDailyRow, type RateSource } from '@/types';
import { formatDateTime } from '@/utils/date';
import { formatRate, formatSignedPercent } from '@/utils/rateCalc';
import { pairOptionsForSource } from '@/utils/source';

const { Title } = Typography;

interface Filters {
  pair?: string;
  source?: RateSource;
  dataDate?: string;
}

function RateCell({ value }: { value: string }) {
  return <span className="num-cell">{formatRate(value, 4)}</span>;
}

function ChangePctCell({ ratio }: { ratio: string | null }) {
  const text = formatSignedPercent(ratio);
  const tone = text === '-' || text === '0.00%' ? 'flat' : text.startsWith('-') ? 'down' : 'up';
  return <span className={`num-cell change-${tone}`}>{text}</span>;
}

export default function RateDataPage() {
  const { pairs, dailyRows, sourceSync } = useRateStore();
  const [form] = Form.useForm();
  const [filters, setFilters] = useState<Filters>({});
  const [historyRow, setHistoryRow] = useState<RateDailyRow | null>(null);
  const watchedSource = Form.useWatch('source', form) as RateSource | undefined;
  const pairOptions = useMemo(
    () => pairOptionsForSource(pairs, watchedSource ?? filters.source),
    [pairs, watchedSource, filters.source],
  );

  const filtered = useMemo(() => {
    return dailyRows.filter((item) => {
      if (filters.pair && item.pair !== filters.pair) return false;
      if (filters.source && item.source !== filters.source) return false;
      if (filters.dataDate && item.dataDate !== filters.dataDate) return false;
      return true;
    });
  }, [dailyRows, filters]);

  const lastSyncItems = RATE_SOURCE_IDS.map((source) => {
    const state = sourceSync[source];
    return { source, time: formatDateTime(state.lastSyncAt) };
  });

  const columns: ColumnsType<RateDailyRow> = [
    { title: '货币对', dataIndex: 'pairLabel', width: 104 },
    {
      title: '数据来源',
      dataIndex: 'source',
      width: 112,
      render: (source: RateSource) => <SourceTag source={source} />,
    },
    { title: '数据日期', dataIndex: 'dataDate', width: 120 },
    {
      title: <Tooltip title="Open">开盘</Tooltip>,
      dataIndex: 'open',
      align: 'right',
      width: 96,
      render: (value: string) => <RateCell value={value} />,
    },
    {
      title: <Tooltip title="High">最高</Tooltip>,
      dataIndex: 'high',
      align: 'right',
      width: 96,
      render: (value: string) => <RateCell value={value} />,
    },
    {
      title: <Tooltip title="Low">最低</Tooltip>,
      dataIndex: 'low',
      align: 'right',
      width: 96,
      render: (value: string) => <RateCell value={value} />,
    },
    {
      title: <Tooltip title="Close">收盘</Tooltip>,
      dataIndex: 'close',
      align: 'right',
      width: 96,
      render: (value: string) => <RateCell value={value} />,
    },
    {
      title: <Tooltip title="相对上一交易日收盘">涨跌幅</Tooltip>,
      dataIndex: 'changeRatio',
      align: 'right',
      width: 176,
      render: (value: string | null, record) => (
        <span className="change-cell">
          {record.hasVolatilityWarning ? <WarningTag /> : null}
          <ChangePctCell ratio={value} />
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button type="link" onClick={() => setHistoryRow(record)}>
          近7日
        </Button>
      ),
    },
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <Title level={3}>汇率数据</Title>
      </div>

      <Card className="page-card" variant="outlined">
        <div className="meta-strip">
          <div className="meta-stats">
            {lastSyncItems.map((item) => (
              <div className="meta-stat" key={item.source}>
                <span className="k">{RATE_SOURCE_LABEL[item.source]} 最近更新</span>
                <span className="v">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        <Form
          className="filter-bar"
          form={form}
          layout="inline"
          colon={false}
          onFinish={(values: { pair?: string; source?: RateSource; dataDate?: Dayjs }) => {
            setFilters({
              pair: values.pair,
              source: values.source,
              dataDate: values.dataDate?.format('YYYY-MM-DD'),
            });
          }}
        >
          <Form.Item name="pair" label="货币对">
            <Select allowClear placeholder="全部" style={{ width: 148 }} options={pairOptions} />
          </Form.Item>
          <Form.Item name="source" label="数据来源">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 120 }}
              options={RATE_SOURCE_IDS.map((source) => ({ value: source, label: RATE_SOURCE_LABEL[source] }))}
              onChange={() => form.setFieldValue('pair', undefined)}
            />
          </Form.Item>
          <Form.Item name="dataDate" label="数据日期">
            <DatePicker style={{ width: 148 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                查询
              </Button>
              <Button
                onClick={() => {
                  form.resetFields();
                  setFilters({});
                }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Table
          className="compact-table rate-data-table"
          size="middle"
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          tableLayout="fixed"
          pagination={{
            pageSize: 20,
            showTotal: (total) => `共 ${total} 条`,
            showSizeChanger: true,
            size: 'small',
          }}
          rowClassName={(record) => (record.hasVolatilityWarning ? 'warning-row' : '')}
        />
      </Card>

      <HistoryDrawer
        open={!!historyRow}
        pairLabel={historyRow?.pairLabel}
        source={historyRow?.source}
        history={historyRow?.history ?? []}
        onClose={() => setHistoryRow(null)}
      />
    </div>
  );
}
