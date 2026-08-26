import { useMemo, useState } from 'react';
import { App, Button, Card, Form, Select, Space, Table, Tooltip, Typography } from 'antd';
import { CalculatorOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import BufferConfigModal from '@/components/BufferConfigModal';
import CalcRuleModal from '@/components/CalcRuleModal';
import { EffectiveTag, SourceTag } from '@/components/StatusTags';
import { useRateStore } from '@/store/RateStore';
import type { BufferConfig, EnrichedPair } from '@/types';
import { formatDateTime } from '@/utils/date';
import { combinedBufferOf, formatPercent, formatRate } from '@/utils/rateCalc';

const { Title, Paragraph } = Typography;

interface Filters {
  currency1?: string;
  currency2?: string;
  pair?: string;
}

export default function BusinessRatesPage() {
  const { message } = App.useApp();
  const {
    pairs,
    lastCalculatedAt,
    globalBuffer,
    calculating,
    recalculate,
    saveGlobalBuffer,
    savePairBuffer,
  } = useRateStore();
  const [form] = Form.useForm();
  const [filters, setFilters] = useState<Filters>({});
  const [bufferOpen, setBufferOpen] = useState(false);
  const [editingPair, setEditingPair] = useState<EnrichedPair | null>(null);
  const [rulePair, setRulePair] = useState<EnrichedPair | null>(null);

  const quotePairs = useMemo(() => pairs.filter((item) => item.enabled), [pairs]);
  const currencies1 = [...new Set(quotePairs.map((item) => item.currency1))];
  const currencies2 = [...new Set(quotePairs.map((item) => item.currency2))];

  const filtered = useMemo(() => {
    return quotePairs.filter((item) => {
      if (filters.currency1 && item.currency1 !== filters.currency1) return false;
      if (filters.currency2 && item.currency2 !== filters.currency2) return false;
      if (filters.pair && item.pair !== filters.pair) return false;
      return true;
    });
  }, [filters, quotePairs]);

  const handleSaveGlobal = (config: BufferConfig) => {
    saveGlobalBuffer(config);
    setBufferOpen(false);
    message.success('保存成功，已按新的综合缓冲因子重新计算全部业务报价汇率');
  };

  const handleSavePair = (config: BufferConfig) => {
    if (!editingPair) return;
    savePairBuffer(editingPair.id, config);
    setEditingPair(null);
    message.success('保存成功，已重新计算该货币对的业务报价汇率');
  };

  const columns: ColumnsType<EnrichedPair> = [
    { title: '更新日期', dataIndex: 'updateDate', width: 112 },
    {
      title: '货币对',
      dataIndex: 'pairLabel',
      width: 112,
    },
    {
      title: '报价数据源',
      dataIndex: 'quoteSource',
      width: 112,
      render: (source: EnrichedPair['quoteSource']) => <SourceTag source={source} />,
    },
    {
      title: '7日均价',
      dataIndex: 'avg7',
      align: 'right',
      width: 112,
      render: (value: string) => <span className="num-cell">{formatRate(value, 4)}</span>,
    },
    {
      title: '综合缓冲',
      dataIndex: 'combinedBuffer',
      align: 'right',
      width: 96,
      render: (value: string) => formatPercent(value),
    },
    {
      title: (
        <Tooltip title="客户以基准货币（货币对左侧，如 USD/CNY 中的 USD）结算时使用的报价，按均价下浮后向下取整">
          <span>基准货币报价</span>
        </Tooltip>
      ),
      dataIndex: 'quoteCcy1',
      align: 'right',
      width: 120,
      render: (value: string, record) => (
        <Tooltip title={`${record.currency1} 结算`}>
          <span className="num-cell quote-cell">{formatRate(value, 1)}</span>
        </Tooltip>
      ),
    },
    {
      title: (
        <Tooltip title="客户以计价货币（货币对右侧，如 USD/CNY 中的 CNY）结算时使用的报价，按均价上浮后向上取整">
          <span>计价货币报价</span>
        </Tooltip>
      ),
      dataIndex: 'quoteCcy2',
      align: 'right',
      width: 120,
      render: (value: string, record) => (
        <Tooltip title={`${record.currency2} 结算`}>
          <span className="num-cell quote-cell">{formatRate(value, 1)}</span>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: () => <EffectiveTag />,
    },
    {
      title: '操作',
      key: 'action',
      width: 168,
      render: (_, record) => (
        <Space size={12}>
          <Button type="link" onClick={() => setRulePair(record)}>
            计算规则
          </Button>
          <Button type="link" onClick={() => setEditingPair(record)}>
            缓冲因子
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <Title level={3}>业务报价汇率</Title>
        <Paragraph className="page-desc">
          按指定数据源近 7 个交易日均价和综合缓冲因子，生成两个结算方向的可用报价。
        </Paragraph>
      </div>

      <Card className="page-card" variant="outlined">
        <div className="meta-strip">
          <div className="meta-stats">
            <div className="meta-stat">
              <span className="k">最近计算时间</span>
              <span className="v">{formatDateTime(lastCalculatedAt)}</span>
            </div>
            <div className="meta-stat">
              <span className="k">综合缓冲因子</span>
              <span className="v">{formatPercent(combinedBufferOf(globalBuffer))}</span>
            </div>
          </div>
          <div className="meta-actions">
            <Space>
              <Button icon={<SettingOutlined />} onClick={() => setBufferOpen(true)}>
                缓冲因子配置
              </Button>
              <Button
                type="primary"
                icon={<CalculatorOutlined />}
                loading={calculating}
                onClick={() => {
                  recalculate();
                  message.success('已按当前市场数据和缓冲因子重新计算');
                }}
              >
                重新计算
              </Button>
            </Space>
          </div>
        </div>

        <Form className="filter-bar" form={form} layout="inline" colon={false} onFinish={setFilters}>
          <Form.Item name="currency1" label="基准货币">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 120 }}
              options={currencies1.map((item) => ({ value: item, label: item }))}
            />
          </Form.Item>
          <Form.Item name="currency2" label="计价货币">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 120 }}
              options={currencies2.map((item) => ({ value: item, label: item }))}
            />
          </Form.Item>
          <Form.Item name="pair" label="货币对">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 148 }}
              options={quotePairs.map((item) => ({ value: item.pair, label: item.pairLabel }))}
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

      <BufferConfigModal
        open={bufferOpen}
        pairs={quotePairs}
        initial={globalBuffer}
        onCancel={() => setBufferOpen(false)}
        onSave={handleSaveGlobal}
      />
      <BufferConfigModal
        open={!!editingPair}
        pair={editingPair}
        pairs={quotePairs}
        initial={
          editingPair
            ? { volatilityBuffer: editingPair.volatilityBuffer, fee: editingPair.fee }
            : globalBuffer
        }
        onCancel={() => setEditingPair(null)}
        onSave={handleSavePair}
      />
      <CalcRuleModal open={!!rulePair} pair={rulePair} onClose={() => setRulePair(null)} />
    </div>
  );
}
