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
import dayjs, { type Dayjs } from 'dayjs';
import { RATE_SOURCE_LABEL } from '@/constants';
import HistoryDrawer from '@/components/HistoryDrawer';
import ManualSyncModal from '@/components/ManualSyncModal';
import { SourceTag, SyncStatusTag, WarningTag } from '@/components/StatusTags';
import { useRateStore } from '@/store/RateStore';
import { RATE_SOURCE_IDS, type DateRange, type RateDailyRow, type RateSource, type SyncStatus } from '@/types';
import { formatDateTime, formatSyncRange } from '@/utils/date';
import { formatRate, formatSignedPercent } from '@/utils/rateCalc';
import { formatLatestVolatilityAlert, latestTradingDayWarnings } from '@/utils/volatilityAlert';

const { Title } = Typography;

interface Filters {
  pair?: string;
  source?: RateSource;
  dataDate?: string;
  syncStatus?: SyncStatus;
  warningsOnly?: boolean;
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
  const { message } = App.useApp();
  const {
    pairs,
    dailyRows,
    sourceSync,
    syncing,
    syncAll,
  } = useRateStore();
  const [form] = Form.useForm();
  const [filters, setFilters] = useState<Filters>({});
  const [historyRow, setHistoryRow] = useState<RateDailyRow | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);

  const latestWarnings = useMemo(() => latestTradingDayWarnings(dailyRows), [dailyRows]);
  const alertText = formatLatestVolatilityAlert(latestWarnings);

  const filtered = useMemo(() => {
    return dailyRows.filter((item) => {
      if (filters.pair && item.pair !== filters.pair) return false;
      if (filters.source && item.source !== filters.source) return false;
      if (filters.dataDate && item.dataDate !== filters.dataDate) return false;
      if (filters.syncStatus && item.syncStatus !== filters.syncStatus) return false;
      if (filters.warningsOnly && !item.hasVolatilityWarning) return false;
      return true;
    });
  }, [dailyRows, filters]);

  const showLatestWarnings = () => {
    const date = latestWarnings[0]?.dataDate;
    if (!date) return;
    form.setFieldsValue({
      pair: undefined,
      source: undefined,
      dataDate: dayjs(date),
      syncStatus: undefined,
    });
    setFilters({ dataDate: date, warningsOnly: true });
  };

  const handleSync = async (range: DateRange, sources: RateSource[]) => {
    const result = await syncAll(range, sources);
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
    {
      title: '数据来源',
      dataIndex: 'source',
      render: (source: RateSource) => <SourceTag source={source} />,
    },
    {
      title: '源代码',
      dataIndex: 'sourceCode',
    },
    {
      title: <Tooltip title="Open">开盘</Tooltip>,
      dataIndex: 'open',
      align: 'right',
      render: (value: string) => <RateCell value={value} />,
    },
    {
      title: <Tooltip title="High">最高</Tooltip>,
      dataIndex: 'high',
      align: 'right',
      render: (value: string) => <RateCell value={value} />,
    },
    {
      title: <Tooltip title="Low">最低</Tooltip>,
      dataIndex: 'low',
      align: 'right',
      render: (value: string) => <RateCell value={value} />,
    },
    {
      title: <Tooltip title="Close">收盘</Tooltip>,
      dataIndex: 'close',
      align: 'right',
      render: (value: string) => <RateCell value={value} />,
    },
    {
      title: <Tooltip title="相对上一交易日收盘">涨跌幅</Tooltip>,
      dataIndex: 'changeRatio',
      align: 'right',
      render: (value: string | null) => <ChangePctCell ratio={value} />,
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
        <Space size={4} wrap={false}>
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

      {latestWarnings.length > 0 ? (
        <Alert
          className="page-alert"
          type="warning"
          showIcon
          title={alertText}
          action={
            <Button size="small" onClick={showLatestWarnings}>
              查看
            </Button>
          }
        />
      ) : null}

      <Card className="page-card" variant="outlined">
        <div className="meta-strip">
          <div className="meta-stats">
            <div className="meta-stat">
              <span className="k">Reuters</span>
              <span className="v">
                <SyncStatusTag status={syncing && sourceSync.reuters.lastSyncStatus === '同步中' ? '同步中' : sourceSync.reuters.lastSyncStatus} />
                <span style={{ marginLeft: 8 }}>{formatDateTime(sourceSync.reuters.lastSyncAt)}</span>
              </span>
            </div>
            <div className="meta-stat">
              <span className="k">英为财经</span>
              <span className="v">
                <SyncStatusTag status={syncing && sourceSync.investing.lastSyncStatus === '同步中' ? '同步中' : sourceSync.investing.lastSyncStatus} />
                <span style={{ marginLeft: 8 }}>{formatDateTime(sourceSync.investing.lastSyncAt)}</span>
              </span>
            </div>
            <div className="meta-stat">
              <span className="k">最近同步时间段</span>
              <span className="v">{formatSyncRange(sourceSync.reuters.lastSyncRange?.start, sourceSync.reuters.lastSyncRange?.end)}</span>
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
          onFinish={(values: { pair?: string; source?: RateSource; dataDate?: Dayjs; syncStatus?: SyncStatus }) => {
            setFilters({
              pair: values.pair,
              source: values.source,
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
          <Form.Item name="source" label="数据来源">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 132 }}
              options={RATE_SOURCE_IDS.map((source) => ({ value: source, label: RATE_SOURCE_LABEL[source] }))}
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
          className="compact-table rate-data-table"
          size="middle"
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          tableLayout="auto"
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
      <ManualSyncModal
        open={syncOpen}
        loading={syncing}
        defaultRange={sourceSync.reuters.lastSyncRange ?? sourceSync.investing.lastSyncRange}
        pairCount={pairs.filter((item) => item.enabled).length}
        onCancel={() => {
          if (!syncing) setSyncOpen(false);
        }}
        onOk={(range, sources) => void handleSync(range, sources)}
      />
    </div>
  );
}
