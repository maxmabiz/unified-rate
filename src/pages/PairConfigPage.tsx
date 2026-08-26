import { useMemo, useState } from 'react';
import { App, Button, Card, Form, Modal, Select, Space, Table, Tooltip, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ChangeLogDrawer from '@/components/ChangeLogDrawer';
import ChangeSourceModal from '@/components/ChangeSourceModal';
import { EnabledTag, SourceTag } from '@/components/StatusTags';
import { useRateStore } from '@/store/RateStore';
import type { EnrichedPair, RateSource } from '@/types';
import { formatDateTime } from '@/utils/date';
import { firstQuoteDate } from '@/utils/officialQuote';
import { connectedSources } from '@/utils/source';

const { Title, Paragraph } = Typography;

interface Filters {
  pair?: string;
  enabled?: boolean;
}

export default function PairConfigPage() {
  const { message } = App.useApp();
  const { pairs, officialQuotes, changeLogs, setQuoteSource, setPairEnabled } = useRateStore();
  const [form] = Form.useForm();
  const [filters, setFilters] = useState<Filters>({});
  const [changingPair, setChangingPair] = useState<EnrichedPair | null>(null);
  const [disablingPair, setDisablingPair] = useState<EnrichedPair | null>(null);
  const [logPair, setLogPair] = useState<EnrichedPair | null>(null);

  const pairLogs = useMemo(
    () => (logPair ? changeLogs.filter((item) => item.pairId === logPair.id) : []),
    [changeLogs, logPair],
  );

  const filtered = useMemo(() => {
    return pairs.filter((item) => {
      if (filters.pair && item.pair !== filters.pair) return false;
      if (filters.enabled !== undefined && item.enabled !== filters.enabled) return false;
      return true;
    });
  }, [filters, pairs]);

  const handleChangeSource = (source: RateSource) => {
    if (!changingPair) return;
    const result = setQuoteSource(changingPair.id, source);
    if (!result.ok) {
      message.error(result.error || '保存失败');
      return;
    }
    setChangingPair(null);
    message.success(`已更改 ${changingPair.pairLabel} 的报价数据源，下次生成报价时生效`);
  };

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
    { title: 'Reuters代码', dataIndex: ['feeds', 'reuters', 'code'], width: 108 },
    { title: '英为财经代码', dataIndex: ['feeds', 'investing', 'code'], width: 112 },
    {
      title: '报价数据源',
      dataIndex: 'quoteSource',
      width: 104,
      render: (source: EnrichedPair['quoteSource']) => <SourceTag source={source} />,
    },
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
      width: 188,
      render: (_, record) => {
        const canChangeSource = connectedSources(record).length > 1;
        return (
          <Space size={8}>
            {canChangeSource ? (
              <Button type="link" onClick={() => setChangingPair(record)}>
                更改数据源
              </Button>
            ) : (
              <Tooltip title="当前仅接入一个数据源，无法更改">
                <span>
                  <Button type="link" disabled>
                    更改数据源
                  </Button>
                </span>
              </Tooltip>
            )}
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
        );
      },
    },
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <Title level={3}>货币对配置</Title>
        <Paragraph className="page-desc">
          货币对由技术后台配置。财务可更改报价数据源，并启用或停用。更改数据源后，下次生成报价时生效。
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
          scroll={{ x: 1136 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条`,
            showSizeChanger: false,
            size: 'small',
          }}
        />
      </Card>

      <ChangeSourceModal
        open={!!changingPair}
        pair={changingPair}
        onCancel={() => setChangingPair(null)}
        onSubmit={handleChangeSource}
      />
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
        <Paragraph>停用后不再出现在当天业务报价中。</Paragraph>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          已存档的历史报价和已同步行情仍可查阅，不会删除。
        </Paragraph>
      </Modal>
    </div>
  );
}
