import { useMemo, useState } from 'react';
import { App, Button, Card, Form, Popconfirm, Select, Space, Table, Typography } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PairFormModal, { type PairFormValues } from '@/components/PairFormModal';
import { EnabledTag } from '@/components/StatusTags';
import { useRateStore } from '@/store/RateStore';
import type { EnrichedPair } from '@/types';
import { formatDateTime } from '@/utils/date';

const { Title, Paragraph } = Typography;

interface Filters {
  pair?: string;
  enabled?: boolean;
}

export default function PairConfigPage() {
  const { message } = App.useApp();
  const { pairs, addPair, updatePair, setPairEnabled } = useRateStore();
  const [form] = Form.useForm();
  const [filters, setFilters] = useState<Filters>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPair, setEditingPair] = useState<EnrichedPair | null>(null);

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
    const result = editingPair
      ? updatePair(editingPair.id, { reutersCode: values.reutersCode })
      : addPair(values);
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
    message.success(enabled ? `已启用 ${pair.pairLabel}` : `已停用 ${pair.pairLabel}，历史行情仍保留`);
  };

  const columns: ColumnsType<EnrichedPair> = [
    { title: '货币对', dataIndex: 'pairLabel', width: 112 },
    { title: '基准货币', dataIndex: 'currency1', width: 100 },
    { title: '计价货币', dataIndex: 'currency2', width: 100 },
    { title: 'Reuters代码', dataIndex: 'reutersCode', width: 140 },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 96,
      render: (enabled: boolean) => <EnabledTag enabled={enabled} />,
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
            <Popconfirm
              title={`停用 ${record.pairLabel}？`}
              description="停用后不再出现在业务报价汇率中，已同步的历史行情仍保留。"
              okText="停用"
              cancelText="取消"
              onConfirm={() => handleToggle(record, false)}
            >
              <Button type="link">停用</Button>
            </Popconfirm>
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
        <Paragraph className="page-desc">
          维护纳入统一汇率管理的货币对、Reuters 代码和启用状态。缓冲因子仍在业务报价汇率中配置。
        </Paragraph>
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
    </div>
  );
}
