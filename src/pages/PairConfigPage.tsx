import { useMemo, useState } from 'react';
import { App, Button, Card, Form, Modal, Select, Space, Table, Tooltip, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ChangeLogDrawer from '@/components/ChangeLogDrawer';
import { EnabledTag, SourceTag } from '@/components/StatusTags';
import { RATE_SOURCE_LABEL } from '@/constants';
import { useRateStore } from '@/store/RateStore';
import { RATE_SOURCE_IDS, type PairSourceRow, type RateSource } from '@/types';
import { formatDateTime } from '@/utils/date';
import { pairConfigLogs } from '@/utils/changeLog';
import { firstQuoteDate } from '@/utils/officialQuote';
import { flattenPairSourceRows, pairOptionsForSource } from '@/utils/source';

const { Title, Paragraph } = Typography;

interface Filters {
  pair?: string;
  source?: RateSource;
  enabled?: boolean;
}

export default function PairConfigPage() {
  const { message } = App.useApp();
  const { pairs, officialQuotes, changeLogs, setSourceEnabled } = useRateStore();
  const [form] = Form.useForm();
  const [filters, setFilters] = useState<Filters>({});
  const [disablingRow, setDisablingRow] = useState<PairSourceRow | null>(null);
  const [logRow, setLogRow] = useState<PairSourceRow | null>(null);
  const watchedSource = Form.useWatch('source', form) as RateSource | undefined;

  const rows = useMemo(() => flattenPairSourceRows(pairs), [pairs]);
  const pairOptions = useMemo(
    () => pairOptionsForSource(pairs, watchedSource ?? filters.source),
    [pairs, watchedSource, filters.source],
  );

  const pairLogs = useMemo(
    () => (logRow ? pairConfigLogs(changeLogs, logRow.pairId, logRow.source) : []),
    [changeLogs, logRow],
  );

  const filtered = useMemo(() => {
    return rows.filter((item) => {
      if (filters.pair && item.pair !== filters.pair) return false;
      if (filters.source && item.source !== filters.source) return false;
      if (filters.enabled !== undefined && item.enabled !== filters.enabled) return false;
      return true;
    });
  }, [filters, rows]);

  const handleToggle = (row: PairSourceRow, enabled: boolean) => {
    const result = setSourceEnabled(row.pairId, row.source, enabled);
    if (!result.ok) {
      message.error(result.error || '操作失败');
      return;
    }
    if (!enabled) setDisablingRow(null);
    const sourceLabel = RATE_SOURCE_LABEL[row.source];
    message.success(
      enabled
        ? `已启用 ${row.pairLabel}（${sourceLabel}）`
        : `已停用 ${row.pairLabel}（${sourceLabel}），历史行情仍保留`,
    );
  };

  const columns: ColumnsType<PairSourceRow> = [
    { title: '货币对', dataIndex: 'pairLabel', width: 96 },
    {
      title: '数据来源',
      dataIndex: 'source',
      width: 100,
      render: (source: RateSource) => <SourceTag source={source} />,
    },
    { title: '基准货币', dataIndex: 'currency1', width: 88 },
    { title: '计价货币', dataIndex: 'currency2', width: 88 },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 72,
      render: (enabled: boolean) => <EnabledTag enabled={enabled} />,
    },
    {
      title: (
        <Tooltip title="该货币对在此数据源已存档官方报价中最早的行情日，用于看清从哪天开始报；不是预约生效日。">
          <span>首次报价日</span>
        </Tooltip>
      ),
      key: 'firstQuoteDate',
      width: 112,
      render: (_, record) => firstQuoteDate(officialQuotes, record.pairId, record.source) ?? '-',
    },
    {
      title: '最近修改时间',
      dataIndex: 'configUpdatedAt',
      width: 168,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'action',
      width: 128,
      render: (_, record) => (
        <Space size={8}>
          {record.enabled ? (
            <Button type="link" onClick={() => setDisablingRow(record)}>
              停用
            </Button>
          ) : (
            <Button type="link" onClick={() => handleToggle(record, true)}>
              启用
            </Button>
          )}
          <Button type="link" onClick={() => setLogRow(record)}>
            日志
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <Title level={3}>货币对配置</Title>
        <Paragraph className="page-desc">
          每个数据源单独维护一套货币对。财务可按数据源启用或停用。
        </Paragraph>
      </div>

      <Card className="page-card" variant="outlined">
        <Form className="filter-bar" form={form} layout="inline" colon={false} onFinish={setFilters}>
          <Form.Item name="pair" label="货币对">
            <Select allowClear placeholder="全部" style={{ width: 148 }} options={pairOptions} />
          </Form.Item>
          <Form.Item name="source" label="数据源">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 120 }}
              options={RATE_SOURCE_IDS.map((source) => ({
                value: source,
                label: RATE_SOURCE_LABEL[source],
              }))}
              onChange={() => form.setFieldValue('pair', undefined)}
            />
          </Form.Item>
          <Form.Item name="enabled" label="状态">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 120 }}
              options={[
                { value: true, label: '启用' },
                { value: false, label: '停用' },
              ]}
            />
          </Form.Item>
          <Form.Item className="filter-actions">
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
          scroll={{ x: 852 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条`,
            showSizeChanger: false,
            size: 'small',
          }}
        />
      </Card>

      <ChangeLogDrawer
        pairLabel={logRow?.pairLabel}
        source={logRow?.source}
        logs={pairLogs}
        open={!!logRow}
        onClose={() => setLogRow(null)}
      />
      <Modal
        title={
          disablingRow
            ? `停用 ${disablingRow.pairLabel}（${RATE_SOURCE_LABEL[disablingRow.source]}）？`
            : '停用货币对？'
        }
        open={!!disablingRow}
        onCancel={() => setDisablingRow(null)}
        onOk={() => {
          if (disablingRow) handleToggle(disablingRow, false);
        }}
        okText="停用"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Paragraph>停用后该数据源不再出现在当天履约报价中。</Paragraph>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          同一货币对的其他数据源不受影响。已存档的历史报价和已同步行情仍可查阅，不会删除。
        </Paragraph>
      </Modal>
    </div>
  );
}
