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
  Tooltip,
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

function RateCell({ value }: { value: string }) {
  return <span className="num-cell">{formatRate(value, 4)}</span>;
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
    { title: '货币对', dataIndex: 'pairLabel', width: 96 },
    { title: '数据日期', dataIndex: 'dataDate', width: 112 },
    { title: 'Reuters代码', dataIndex: 'reutersCode', width: 112 },
    {
      title: <Tooltip title="Open">开盘</Tooltip>,
      dataIndex: 'open',
      width: 92,
      align: 'right',
      render: (value: string) => <RateCell value={value} />,
    },
    {
      title: <Tooltip title="High">最高</Tooltip>,
      dataIndex: 'high',
      width: 92,
      align: 'right',
      render: (value: string) => <RateCell value={value} />,
    },
    {
      title: <Tooltip title="Low">最低</Tooltip>,
      dataIndex: 'low',
      width: 92,
      align: 'right',
      render: (value: string) => <RateCell value={value} />,
    },
    {
      title: <Tooltip title="Close">收盘</Tooltip>,
      dataIndex: 'close',
      width: 92,
      align: 'right',
      render: (value: string) => <RateCell value={value} />,
    },
    {
      title: '最近同步时间',
      dataIndex: 'lastSyncAt',
      width: 168,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '同步状态',
      dataIndex: 'syncStatus',
      width: 148,
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
      width: 88,
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
        <Paragraph className="page-desc">
          从 Reuters 同步的市场行情，作为业务报价汇率的计算底稿。
        </Paragraph>
      </div>

      {warningCount > 0 ? (
        <Alert
          className="page-alert"
          type="warning"
          showIcon
          message={VOLATILITY_WARNING_TEXT}
        />
      ) : null}

      <Card className="page-card" variant="outlined">
        <div className="meta-strip">
          <div className="meta-stats">
            <div className="meta-stat">
              <span className="k">数据来源</span>
              <span className="v">{DATA_SOURCE}</span>
            </div>
            <div className="meta-stat">
              <span className="k">更新频率</span>
              <span className="v">{UPDATE_FREQUENCY}</span>
            </div>
            <div className="meta-stat">
              <span className="k">最近同步时间段</span>
              <span className="v">{formatSyncRange(lastSyncRange?.start, lastSyncRange?.end)}</span>
            </div>
            <div className="meta-stat">
              <span className="k">最近同步时间</span>
              <span className="v">{formatDateTime(lastSyncAt)}</span>
            </div>
            <div className="meta-stat">
              <span className="k">当前同步状态</span>
              <span className="v">
                <SyncStatusTag status={syncing ? '同步中' : lastSyncStatus} />
              </span>
            </div>
          </div>
          <div className="meta-actions">
            <Button
              type="primary"
              icon={syncing ? <SyncOutlined spin /> : <ReloadOutlined />}
              loading={syncing}
              onClick={() => setSyncOpen(true)}
            >
              手动同步
            </Button>
          </div>
        </div>

        <Form
          className="filter-bar"
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
              style={{ width: 148 }}
              options={pairs.map((item) => ({ value: item.pair, label: item.pairLabel }))}
            />
          </Form.Item>
          <Form.Item name="dataDate" label="数据日期">
            <DatePicker style={{ width: 148 }} />
          </Form.Item>
          <Form.Item name="syncStatus" label="同步状态">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 120 }}
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
          className="compact-table"
          size="middle"
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          tableLayout="fixed"
          sticky
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
        history={historyRow?.history ?? []}
        onClose={() => setHistoryRow(null)}
      />
      <ManualSyncModal
        open={syncOpen}
        loading={syncing}
        defaultRange={lastSyncRange}
        pairCount={pairs.filter((item) => item.enabled).length}
        onCancel={() => {
          if (!syncing) setSyncOpen(false);
        }}
        onOk={(range) => void handleSync(range)}
      />
    </div>
  );
}
