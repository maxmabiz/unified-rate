import { useEffect, useMemo } from 'react';
import { Form, InputNumber, Modal, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { BufferConfig, EnrichedPair } from '@/types';
import { computeQuotes, formatRate, fractionToPercentNumber, percentToFraction } from '@/utils/rateCalc';
import { tradingBars } from '@/utils/date';
import { quoteHistory } from '@/utils/source';

const { Text } = Typography;

interface BufferConfigModalProps {
  open: boolean;
  pair?: EnrichedPair | null;
  pairs: EnrichedPair[];
  initial: BufferConfig;
  onCancel: () => void;
  onSave: (config: BufferConfig) => void;
}

interface PreviewRow {
  key: string;
  pair: string;
  avg7: string;
  before1: string;
  before2: string;
  after1: string;
  after2: string;
}

export default function BufferConfigModal({
  open,
  pair,
  pairs,
  initial,
  onCancel,
  onSave,
}: BufferConfigModalProps) {
  const [form] = Form.useForm<{ volatility: number; fee: number }>();
  const volatility = Form.useWatch('volatility', form) ?? fractionToPercentNumber(initial.volatilityBuffer);
  const fee = Form.useWatch('fee', form) ?? fractionToPercentNumber(initial.fee);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      volatility: fractionToPercentNumber(initial.volatilityBuffer),
      fee: fractionToPercentNumber(initial.fee),
    });
  }, [form, initial, open]);

  const combinedPercent = Number(((volatility ?? 0) + (fee ?? 0)).toFixed(2));
  const nextConfig: BufferConfig = {
    volatilityBuffer: percentToFraction(volatility ?? 0),
    fee: percentToFraction(fee ?? 0),
  };

  const previewPairs = pair ? [pair] : pairs;

  const previewRows = useMemo<PreviewRow[]>(() => {
    return previewPairs.map((item) => {
      const after = computeQuotes(tradingBars(quoteHistory(item)), nextConfig);
      return {
        key: item.id,
        pair: item.pairLabel,
        avg7: item.avg7,
        before1: item.quoteCcy1,
        before2: item.quoteCcy2,
        after1: after.quoteCcy1,
        after2: after.quoteCcy2,
      };
    });
  }, [nextConfig.fee, nextConfig.volatilityBuffer, previewPairs]);

  const columns: ColumnsType<PreviewRow> = [
    { title: '货币对', dataIndex: 'pair', width: 110 },
    {
      title: '7日均价',
      dataIndex: 'avg7',
      align: 'right',
      render: (value: string) => formatRate(value, 4),
    },
    {
      title: '修改前报价',
      key: 'before',
      align: 'right',
      render: (_, record) => `${record.before1} / ${record.before2}`,
    },
    {
      title: '修改后报价',
      key: 'after',
      align: 'right',
      render: (_, record) => `${record.after1} / ${record.after2}`,
    },
  ];

  return (
    <Modal
      title={pair ? `修改缓冲因子 · ${pair.pairLabel}` : '缓冲因子配置'}
      open={open}
      onCancel={onCancel}
      onOk={() => {
        onSave(nextConfig);
      }}
      okText="保存"
      width={pair ? 640 : 760}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="汇率波动缓冲"
          name="volatility"
          rules={[{ required: true, message: '请输入汇率波动缓冲' }]}
        >
          <InputNumber min={0} max={20} step={0.1} precision={2} addonAfter="%" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label="手续费"
          name="fee"
          rules={[{ required: true, message: '请输入手续费' }]}
        >
          <InputNumber min={0} max={20} step={0.1} precision={2} addonAfter="%" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="综合缓冲因子">
          <InputNumber value={combinedPercent} addonAfter="%" disabled style={{ width: '100%' }} />
          <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
            综合缓冲因子 = 汇率波动缓冲 + 手续费
          </Text>
        </Form.Item>
      </Form>

      <Text strong>计算预览</Text>
      <Table
        rowKey="key"
        pagination={false}
        columns={columns}
        dataSource={previewRows}
        style={{ marginTop: 8 }}
        scroll={{ y: 280 }}
      />
    </Modal>
  );
}
