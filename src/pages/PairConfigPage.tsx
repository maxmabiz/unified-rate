import { useMemo, useState } from 'react';
import { App, Button, Card, Form, Modal, Select, Space, Table, Tooltip, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ChangeLogDrawer from '@/components/ChangeLogDrawer';
import { EnabledTag } from '@/components/StatusTags';
import { useRateStore } from '@/store/RateStore';
import type { EnrichedPair } from '@/types';
import { formatDateTime } from '@/utils/date';
import { pairConfigLogs } from '@/utils/changeLog';
import { firstQuoteDate } from '@/utils/officialQuote';

const { Title, Paragraph } = Typography;

interface Filters {
  pair?: string;
  enabled?: boolean;
}

export default function PairConfigPage() {
  const { message } = App.useApp();
  const { pairs, officialQuotes, changeLogs, setPairEnabled } = useRateStore();
  const [form] = Form.useForm();
  const [filters, setFilters] = useState<Filters>({});
  const [disablingPair, setDisablingPair] = useState<EnrichedPair | null>(null);
  const [logPair, setLogPair] = useState<EnrichedPair | null>(null);

  const pairLogs = useMemo(
    () => (logPair ? pairConfigLogs(changeLogs, logPair.id) : []),
    [changeLogs, logPair],
  );

  const filtered = useMemo(() => {
    return pairs.filter((item) => {
      if (filters.pair && item.pair !== filters.pair) return false;
      if (filters.enabled !== undefined && item.enabled !== filters.enabled) return false;
      return true;
    });
  }, [filters, pairs]);

  const handleToggle = (pair: EnrichedPair, enabled: boolean) => {
    const result = setPairEnabled(pair.id, enabled);
    if (!result.ok) {
      message.error(result.error || '操作失败');
      return;
    }
    if (!enabled) setDisablingPair(null);
    message.success(enabled ? `已启用 ${pair.pairLabel}` : `已停用 ${pair.pairLabel}，历史行情仍保留`);
  };

  const columns: ColumnsType<EnrichedPair> = [
    { title: '货币对', dataIndex: 'pairLabel', width: 96 },
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
        <Tooltip title="该货币对已存档官方报价中最早的行情日，用于看清从哪天开始报；不是预约生效日。">
          <span>首次报价日</span>
        </Tooltip>
      ),
      key: 'firstQuoteDate',
      width: 112,
      render: (_, record) => firstQuoteDate(officialQuotes, record.id) ?? '-',
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
            <Button type="link" onClick={() => setDisablingPair(record)}>
              停用
            </Button>
          ) : (
            <Button type="link" onClick={() => handleToggle(record, true)}>
              启用
            </Button>
          )}
          <Button type="link" onClick={() => setLogPair(record)}>
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
          货币对由技术后台配置。财务可启用或停用。各接入数据源都会生成履约报价。
        </Paragraph>
      </div>

      <Card className="page-card" variant="outlined">
        <Form className="filter-bar" form={form} layout="inline" colon={false} onFinish={setFilters}>
          <Form.Item name="pair" label="货币对">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 148 }}
              options={pairs.map((item) => ({ value: item.pair, label: item.pairLabel }))}
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
          scroll={{ x: 752 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条`,
            showSizeChanger: false,
            size: 'small',
          }}
        />
      </Card>

      <ChangeLogDrawer
        pairLabel={logPair?.pairLabel}
        logs={pairLogs}
        open={!!logPair}
        onClose={() => setLogPair(null)}
      />
      <Modal
        title={disablingPair ? `停用 ${disablingPair.pairLabel}？` : '停用货币对？'}
        open={!!disablingPair}
        onCancel={() => setDisablingPair(null)}
        onOk={() => {
          if (disablingPair) handleToggle(disablingPair, false);
        }}
        okText="停用"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Paragraph>停用后不再出现在当天履约报价中。</Paragraph>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          已存档的历史报价和已同步行情仍可查阅，不会删除。
        </Paragraph>
      </Modal>
    </div>
  );
}
