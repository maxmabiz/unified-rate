import { useMemo, useState } from 'react';
import { Alert, App, Button, Card, Form, Select, Space, Table, Tooltip, Typography } from 'antd';
import { CalculatorOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import BufferConfigModal from '@/components/BufferConfigModal';
import CalcRuleModal from '@/components/CalcRuleModal';
import { EffectiveTag } from '@/components/StatusTags';
import { useRateStore } from '@/store/RateStore';
import type { BufferConfig, EnrichedPair } from '@/types';
import { formatDateTime } from '@/utils/date';
import { VOLATILITY_WARNING_TEXT, combinedBufferOf, formatPercent, formatRate } from '@/utils/rateCalc';

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

  const warningCount = pairs.filter((item) => item.hasVolatilityWarning).length;
  const currencies1 = [...new Set(pairs.map((item) => item.currency1))];
  const currencies2 = [...new Set(pairs.map((item) => item.currency2))];

  const filtered = useMemo(() => {
    return pairs.filter((item) => {
      if (filters.currency1 && item.currency1 !== filters.currency1) return false;
      if (filters.currency2 && item.currency2 !== filters.currency2) return false;
      if (filters.pair && item.pair !== filters.pair) return false;
      return true;
    });
  }, [filters, pairs]);

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
    { title: '更新日期', dataIndex: 'updateDate', width: '10%' },
    { title: '货币1', dataIndex: 'currency1', width: '7%' },
    { title: '货币2', dataIndex: 'currency2', width: '7%' },
    { title: '业务报价货币对', dataIndex: 'pair', width: '12%' },
    {
      title: '最近7日平均汇率',
      dataIndex: 'avg7',
      align: 'right',
      width: '12%',
      render: (value: string) => <span className="num-cell">{formatRate(value, 4)}</span>,
    },
    {
      title: '综合缓冲因子',
      dataIndex: 'combinedBuffer',
      align: 'right',
      width: '10%',
      render: (value: string) => formatPercent(value),
    },
    {
      title: (
        <Tooltip title="客户结算币种为货币1时的报价汇率">
          <span>货币1报价</span>
        </Tooltip>
      ),
      dataIndex: 'quoteCcy1',
      align: 'right',
      width: '9%',
      render: (value: string) => <span className="num-cell">{formatRate(value, 1)}</span>,
    },
    {
      title: (
        <Tooltip title="客户结算币种为货币2时的报价汇率">
          <span>货币2报价</span>
        </Tooltip>
      ),
      dataIndex: 'quoteCcy2',
      align: 'right',
      width: '9%',
      render: (value: string) => <span className="num-cell">{formatRate(value, 1)}</span>,
    },
    {
      title: '状态',
      key: 'status',
      width: '10%',
      render: (_, record) => (
        <Tooltip title={record.hasVolatilityWarning ? VOLATILITY_WARNING_TEXT : undefined}>
          <span>
            <EffectiveTag warning={record.hasVolatilityWarning} />
          </span>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: '14%',
      render: (_, record) => (
        <Space size={12}>
          <Button type="link" onClick={() => setRulePair(record)}>
            查看计算规则
          </Button>
          <Button type="link" onClick={() => setEditingPair(record)}>
            修改缓冲因子
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
          展示根据最近7个交易日平均汇率和综合缓冲因子计算出的业务可用报价汇率。
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
              <span className="label">最近计算时间</span>
              <span className="value">{formatDateTime(lastCalculatedAt)}</span>
            </div>
            <div className="meta-item">
              <span className="label">综合缓冲因子</span>
              <span className="value">{formatPercent(combinedBufferOf(globalBuffer))}</span>
            </div>
          </div>
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

        <Form className="filter-row" form={form} layout="inline" colon={false} onFinish={setFilters}>
          <Form.Item name="currency1" label="货币1">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 140 }}
              options={currencies1.map((item) => ({ value: item, label: item }))}
            />
          </Form.Item>
          <Form.Item name="currency2" label="货币2">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 140 }}
              options={currencies2.map((item) => ({ value: item, label: item }))}
            />
          </Form.Item>
          <Form.Item name="pair" label="业务报价货币对">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 180 }}
              options={pairs.map((item) => ({ value: item.pair, label: item.pair }))}
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
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          tableLayout="fixed"
          pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条`, showSizeChanger: false }}
          rowClassName={(record) => (record.hasVolatilityWarning ? 'warning-row' : '')}
        />
      </Card>

      <BufferConfigModal
        open={bufferOpen}
        pairs={pairs}
        initial={globalBuffer}
        onCancel={() => setBufferOpen(false)}
        onSave={handleSaveGlobal}
      />
      <BufferConfigModal
        open={!!editingPair}
        pair={editingPair}
        pairs={pairs}
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
