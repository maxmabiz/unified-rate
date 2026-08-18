import { useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Form,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import { ReloadOutlined, SearchOutlined, SyncOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { DATA_SOURCE, UPDATE_FREQUENCY } from '@/constants';
import HistoryDrawer from '@/components/HistoryDrawer';
import ManualSyncModal from '@/components/ManualSyncModal';
import { SyncStatusTag, WarningTag } from '@/components/StatusTags';
import { useRateStore } from '@/store/RateStore';
import type { DateRange, RateDailyRow, SyncStatus } from '@/types';
import { formatDateTime, formatSyncRange } from '@/utils/date';
import { VOLATILITY_WARNING_TEXT, formatRate } from '@/utils/rateCalc';

const { Title, Paragraph } = Typography;

interface Filters {
  pair?: string;
  dataDate?: string;
  syncStatus?: SyncStatus;
}

export default function RateDataPage() {
  const { message } = App.useApp();
  const {
    pairs,
    dailyRows,
    lastSyncAt,
    lastSyncStatus,
    lastSyncRange,
    syncing,
    syncAll,
  } = useRateStore();
  const [form] = Form.useForm();
  const [filters, setFilters] = useState<Filters>({});
  const [historyRow, setHistoryRow] = useState<RateDailyRow | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);

  const warningCount = dailyRows.filter((item) => item.hasVolatilityWarning).length;

  const filtered = useMemo(() => {
    return dailyRows.filter((item) => {
      if (filters.pair && item.pair !== filters.pair) return false;
      if (filters.dataDate && item.dataDate !== filters.dataDate) return false;
      if (filters.syncStatus && item.syncStatus !== filters.syncStatus) return false;
      return true;
    });
  }, [dailyRows, filters]);

  const handleSync = async (range: DateRange) => {
    const result = await syncAll(range);
    if (result.ok) {
      setSyncOpen(false);
      message.success('同步成功');
    } else {
      message.error(result.error || '同步失败');
    }
  };

  const columns: ColumnsType<RateDailyRow> = [
    { title: '货币对', dataIndex: 'pairLabel' },
    { title: '数据日期', dataIndex: 'dataDate' },
    { title: 'Reuters代码', dataIndex: 'reutersCode' },
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
      title: '最近同步时间',
      dataIndex: 'lastSyncAt',
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '同步状态',
      dataIndex: 'syncStatus',
      render: (_, record) => (
        <Space size={4} wrap>
          <SyncStatusTag status={record.syncStatus} />
          {record.hasVolatilityWarning ? <WarningTag /> : null}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="link" onClick={() => setHistoryRow(record)}>
          查看近7日数据
        </Button>
      ),
    },
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <Title level={3}>汇率数据</Title>
        <Paragraph className="page-desc">
          展示从 Reuters 获取的市场汇率基础数据，为业务报价汇率计算提供数据来源。
        </Paragraph>
      </div>

      {warningCount > 0 ? (
        <Alert
          type="warning"
          showIcon
          title={VOLATILITY_WARNING_TEXT}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <Card className="page-card" variant="outlined">
        <div className="meta-bar">
          <div className="meta-items">
            <div className="meta-item">
              <span className="label">数据来源</span>
              <span className="value">{DATA_SOURCE}</span>
            </div>
            <div className="meta-item">
              <span className="label">更新频率</span>
              <span className="value">{UPDATE_FREQUENCY}</span>
            </div>
            <div className="meta-item">
              <span className="label">最近同步时间段</span>
              <span className="value">{formatSyncRange(lastSyncRange?.start, lastSyncRange?.end)}</span>
            </div>
            <div className="meta-item">
              <span className="label">最近同步时间</span>
              <span className="value">{formatDateTime(lastSyncAt)}</span>
            </div>
            <div className="meta-item">
              <span className="label">当前同步状态</span>
              <SyncStatusTag status={syncing ? '同步中' : lastSyncStatus} />
            </div>
          </div>
          <Button
            type="primary"
            icon={syncing ? <SyncOutlined spin /> : <ReloadOutlined />}
            loading={syncing}
            onClick={() => setSyncOpen(true)}
          >
            手动同步
          </Button>
        </div>

        <Form
          className="filter-row"
          form={form}
          layout="inline"
          colon={false}
          onFinish={(values: { pair?: string; dataDate?: Dayjs; syncStatus?: SyncStatus }) => {
            setFilters({
              pair: values.pair,
              dataDate: values.dataDate?.format('YYYY-MM-DD'),
              syncStatus: values.syncStatus,
            });
          }}
        >
          <Form.Item name="pair" label="货币对">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 180 }}
              options={pairs.map((item) => ({ value: item.pair, label: item.pairLabel }))}
            />
          </Form.Item>
          <Form.Item name="dataDate" label="数据日期">
            <DatePicker style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="syncStatus" label="同步状态">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 160 }}
              options={['正常', '同步中', '失败'].map((item) => ({ value: item, label: item }))}
            />
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
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          tableLayout="fixed"
          pagination={{ pageSize: 20, showTotal: (total) => `共 ${total} 条`, showSizeChanger: true }}
          rowClassName={(record) => (record.hasVolatilityWarning ? 'warning-row' : '')}
        />
      </Card>

      <HistoryDrawer
        open={!!historyRow}
        pairLabel={historyRow?.pairLabel}
        history={historyRow?.history ?? []}
        onClose={() => setHistoryRow(null)}
      />
      <ManualSyncModal
        open={syncOpen}
        loading={syncing}
        defaultRange={lastSyncRange}
        pairCount={pairs.length}
        onCancel={() => {
          if (!syncing) setSyncOpen(false);
        }}
        onOk={(range) => void handleSync(range)}
      />
    </div>
  );
}
