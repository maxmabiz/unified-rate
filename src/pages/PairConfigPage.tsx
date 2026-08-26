import { useMemo, useState } from 'react';
import { App, Button, Card, Form, Modal, Select, Space, Table, Tooltip, Typography } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PairFormModal, { type PairFormValues } from '@/components/PairFormModal';
import { EnabledTag, SourceTag } from '@/components/StatusTags';
import { useRateStore } from '@/store/RateStore';
import type { EnrichedPair } from '@/types';
import { formatDateTime } from '@/utils/date';
import { firstQuoteDate } from '@/utils/officialQuote';

const { Title, Paragraph } = Typography;

interface Filters {
  pair?: string;
  enabled?: boolean;
}

export default function PairConfigPage() {
  const { message } = App.useApp();
  const { pairs, officialQuotes, addPair, updatePair, setPairEnabled } = useRateStore();
  const [form] = Form.useForm();
  const [filters, setFilters] = useState<Filters>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPair, setEditingPair] = useState<EnrichedPair | null>(null);
  const [disablingPair, setDisablingPair] = useState<EnrichedPair | null>(null);

  const enabledCount = pairs.filter((item) => item.enabled).length;

  const filtered = useMemo(() => {
    return pairs.filter((item) => {
      if (filters.pair && item.pair !== filters.pair) return false;
      if (filters.enabled !== undefined && item.enabled !== filters.enabled) return false;
      return true;
    });
  }, [filters, pairs]);

  const openAdd = () => {
    setEditingPair(null);
    setModalOpen(true);
  };

  const openEdit = (pair: EnrichedPair) => {
    setEditingPair(pair);
    setModalOpen(true);
  };

  const handleSubmit = (values: PairFormValues) => {
    const payload = {
      currency1: values.currency1,
      currency2: values.currency2,
      reutersCode: values.reutersCode ?? '',
      investingCode: values.investingCode ?? '',
      reutersConnected: values.reutersConnected,
      investingConnected: values.investingConnected,
      quoteSource: values.quoteSource,
    };
    const result = editingPair
      ? updatePair(editingPair.id, payload)
      : addPair(payload);
    if (!result.ok) {
      message.error(result.error || '保存失败');
      return;
    }
    setModalOpen(false);
    setEditingPair(null);
    message.success(editingPair ? '已更新货币对配置' : '已新增货币对，并生成模拟行情');
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
    { title: '货币对', dataIndex: 'pairLabel', width: 112 },
    { title: '基准货币', dataIndex: 'currency1', width: 100 },
    { title: '计价货币', dataIndex: 'currency2', width: 100 },
    { title: 'Reuters代码', dataIndex: ['feeds', 'reuters', 'code'], width: 120 },
    { title: '英为财经代码', dataIndex: ['feeds', 'investing', 'code'], width: 128 },
    {
      title: '报价数据源',
      dataIndex: 'quoteSource',
      width: 112,
      render: (source: EnrichedPair['quoteSource']) => <SourceTag source={source} />,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 96,
      render: (enabled: boolean) => <EnabledTag enabled={enabled} />,
    },
    {
      title: (
        <Tooltip title="该货币对已存档官方报价中最早的行情日，用于看清从哪天开始报；不是预约生效日。">
          <span>首次报价日</span>
        </Tooltip>
      ),
      key: 'firstQuoteDate',
      width: 120,
      render: (_, record) => firstQuoteDate(officialQuotes, record.id) ?? '-',
    },
    {
      title: '最近更新时间',
      dataIndex: 'configUpdatedAt',
      width: 176,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'action',
      width: 148,
      render: (_, record) => (
        <Space size={12}>
          <Button type="link" onClick={() => openEdit(record)}>
            编辑
          </Button>
          {record.enabled ? (
            <Button type="link" onClick={() => setDisablingPair(record)}>
              停用
            </Button>
          ) : (
            <Button type="link" onClick={() => handleToggle(record, true)}>
              启用
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <Title level={3}>货币对配置</Title>
      </div>

      <Card className="page-card" variant="outlined">
        <div className="meta-strip">
          <div className="meta-stats">
            <div className="meta-stat">
              <span className="k">货币对总数</span>
              <span className="v">{pairs.length}</span>
            </div>
            <div className="meta-stat">
              <span className="k">启用中</span>
              <span className="v">{enabledCount}</span>
            </div>
            <div className="meta-stat">
              <span className="k">已停用</span>
              <span className="v">{pairs.length - enabledCount}</span>
            </div>
          </div>
          <div className="meta-actions">
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
              新增货币对
            </Button>
          </div>
        </div>

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
          scroll={{ x: 1180 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条`,
            showSizeChanger: false,
            size: 'small',
          }}
        />
      </Card>

      <PairFormModal
        open={modalOpen}
        pair={editingPair}
        onCancel={() => {
          setModalOpen(false);
          setEditingPair(null);
        }}
        onSubmit={handleSubmit}
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
