import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, InputNumber, Modal, Segmented, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { RATE_SOURCE_LABEL } from '@/constants';
import { RATE_SOURCE_IDS, type BufferConfig, type OfficialQuote, type RateSource } from '@/types';
import { isCustomDayQuote } from '@/utils/buffer';
import { computeQuotes, formatRate, fractionToPercentNumber, percentToFraction } from '@/utils/rateCalc';

const { Text } = Typography;

interface BufferConfigModalProps {
  open: boolean;
  quote?: OfficialQuote | null;
  previewQuotes: OfficialQuote[];
  initial: BufferConfig;
  exceptionCount?: number;
  onCancel: () => void;
  onSave: (config: BufferConfig) => void;
  onRestore?: () => void;
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
  quote,
  previewQuotes,
  initial,
  exceptionCount = 0,
  onCancel,
  onSave,
  onRestore,
}: BufferConfigModalProps) {
  const [form] = Form.useForm<{ volatility: number; fee: number }>();
  const [previewSource, setPreviewSource] = useState<RateSource>(RATE_SOURCE_IDS[0]);
  const volatility = Form.useWatch('volatility', form) ?? fractionToPercentNumber(initial.volatilityBuffer);
  const fee = Form.useWatch('fee', form) ?? fractionToPercentNumber(initial.fee);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      volatility: fractionToPercentNumber(initial.volatilityBuffer),
      fee: fractionToPercentNumber(initial.fee),
    });
    const first = RATE_SOURCE_IDS.find((source) => previewQuotes.some((item) => item.quoteSource === source));
    setPreviewSource(first ?? RATE_SOURCE_IDS[0]);
  }, [form, initial, open, previewQuotes]);

  const combinedPercent = Number(((volatility ?? 0) + (fee ?? 0)).toFixed(2));
  const nextConfig: BufferConfig = {
    volatilityBuffer: percentToFraction(volatility ?? 0),
    fee: percentToFraction(fee ?? 0),
  };

  const sourceQuotes = quote
    ? [quote]
    : previewQuotes.filter((item) => item.quoteSource === previewSource);

  const previewRows = useMemo<PreviewRow[]>(() => {
    return sourceQuotes.map((item) => {
      const after = computeQuotes(item.history, nextConfig);
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
  }, [nextConfig.fee, nextConfig.volatilityBuffer, sourceQuotes]);

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

  const canRestore = Boolean(quote && isCustomDayQuote(quote) && onRestore);

  return (
    <Modal
      title={quote ? `调整当日缓冲 · ${quote.pairLabel} · ${quote.quoteDate}` : '缓冲因子配置'}
      open={open}
      onCancel={onCancel}
      onOk={() => {
        onSave(nextConfig);
      }}
      okText="保存"
      width={quote ? 640 : 760}
      destroyOnHidden
      footer={
        quote ? (
          <div className="buffer-modal-footer">
            {canRestore ? (
              <Button onClick={onRestore}>恢复跟随全局</Button>
            ) : (
              <span />
            )}
            <Space>
              <Button onClick={onCancel}>取消</Button>
              <Button type="primary" onClick={() => onSave(nextConfig)}>
                保存
              </Button>
            </Space>
          </div>
        ) : undefined
      }
    >
      {quote ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="只改当天有效报价，锁定后不可改。下一报价日仍按全局默认生成，不会继承本次配置。"
        />
      ) : exceptionCount > 0 ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`${exceptionCount} 个货币对当天已单独配置。保存后不会立刻重算；点击「重新计算」后只更新跟随全局的报价，不会改动它们。`}
        />
      ) : (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="此处为全局默认，保存后不会立刻重算当天报价。请点击页面上的「重新计算」后生效。"
        />
      )}

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

      <div className="buffer-preview-head">
        <Text strong>计算预览</Text>
        {quote ? null : (
          <Segmented
            size="small"
            value={previewSource}
            options={RATE_SOURCE_IDS.map((source) => ({
              value: source,
              label: RATE_SOURCE_LABEL[source],
            }))}
            onChange={(value) => setPreviewSource(value as RateSource)}
          />
        )}
      </div>
      {quote ? null : (
        <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
          {previewRows.length
            ? `预览点击「重新计算」后 ${RATE_SOURCE_LABEL[previewSource]} 的报价（仅跟随全局）`
            : `${RATE_SOURCE_LABEL[previewSource]} 当前没有跟随全局的货币对，保存后仅更新全局默认`}
        </Text>
      )}
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
