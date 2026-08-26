import { useEffect } from 'react';
import { Form, Input, Modal, Select, Switch, Typography } from 'antd';
import { CURRENCY_OPTIONS, RATE_SOURCE_LABEL, suggestInvestingCode, suggestReutersCode } from '@/constants';
import type { EnrichedPair, RateSource } from '@/types';

const { Text } = Typography;

export interface PairFormValues {
  currency1: string;
  currency2: string;
  reutersConnected: boolean;
  reutersCode: string;
  investingConnected: boolean;
  investingCode: string;
  quoteSource: RateSource;
}

interface PairFormModalProps {
  open: boolean;
  pair?: EnrichedPair | null;
  onCancel: () => void;
  onSubmit: (values: PairFormValues) => void;
}

export default function PairFormModal({ open, pair, onCancel, onSubmit }: PairFormModalProps) {
  const [form] = Form.useForm<PairFormValues>();
  const currency1 = Form.useWatch('currency1', form);
  const currency2 = Form.useWatch('currency2', form);
  const reutersConnected = Form.useWatch('reutersConnected', form);
  const investingConnected = Form.useWatch('investingConnected', form);
  const editing = !!pair;

  useEffect(() => {
    if (!open) return;
    if (pair) {
      form.setFieldsValue({
        currency1: pair.currency1,
        currency2: pair.currency2,
        reutersConnected: pair.feeds.reuters.connected,
        reutersCode: pair.feeds.reuters.code,
        investingConnected: pair.feeds.investing.connected,
        investingCode: pair.feeds.investing.code,
        quoteSource: pair.quoteSource,
      });
      return;
    }
    form.resetFields();
    form.setFieldsValue({
      reutersConnected: true,
      investingConnected: true,
      quoteSource: 'reuters',
    });
  }, [form, open, pair]);

  useEffect(() => {
    if (!open || editing || !currency1 || !currency2 || currency1 === currency2) return;
    form.setFieldValue('reutersCode', suggestReutersCode(currency1, currency2));
    form.setFieldValue('investingCode', suggestInvestingCode(currency1, currency2));
  }, [currency1, currency2, editing, form, open]);

  useEffect(() => {
    if (!open) return;
    const current = form.getFieldValue('quoteSource') as RateSource | undefined;
    if (current === 'reuters' && reutersConnected === false && investingConnected) {
      form.setFieldValue('quoteSource', 'investing');
    }
    if (current === 'investing' && investingConnected === false && reutersConnected) {
      form.setFieldValue('quoteSource', 'reuters');
    }
  }, [form, investingConnected, open, reutersConnected]);

  const quoteOptions: { value: RateSource; label: string }[] = [];
  if (reutersConnected) quoteOptions.push({ value: 'reuters', label: RATE_SOURCE_LABEL.reuters });
  if (investingConnected) quoteOptions.push({ value: 'investing', label: RATE_SOURCE_LABEL.investing });

  return (
    <Modal
      title={editing ? `编辑货币对 · ${pair?.pairLabel}` : '新增货币对'}
      open={open}
      onCancel={onCancel}
      onOk={() => void form.submit()}
      okText={editing ? '保存' : '新增'}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={{
          reutersConnected: true,
          investingConnected: true,
          quoteSource: 'reuters',
        }}
      >
        <Form.Item
          label="基准货币"
          name="currency1"
          rules={[{ required: true, message: '请选择基准货币' }]}
        >
          <Select
            disabled={editing}
            placeholder="如 USD"
            options={CURRENCY_OPTIONS.map((item) => ({ value: item, label: item }))}
          />
        </Form.Item>
        <Form.Item
          label="计价货币"
          name="currency2"
          rules={[
            { required: true, message: '请选择计价货币' },
            {
              validator: async (_, value?: string) => {
                if (value && value === form.getFieldValue('currency1')) {
                  throw new Error('基准货币和计价货币不能相同');
                }
              },
            },
          ]}
        >
          <Select
            disabled={editing}
            placeholder="如 CNY"
            options={CURRENCY_OPTIONS.map((item) => ({ value: item, label: item }))}
          />
        </Form.Item>
        {currency1 && currency2 && currency1 !== currency2 ? (
          <Form.Item label="货币对">
            <Text>{currency1}/{currency2}</Text>
          </Form.Item>
        ) : null}

        <Form.Item label="接入 Reuters" name="reutersConnected" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item
          label="Reuters代码"
          name="reutersCode"
          rules={reutersConnected ? [{ required: true, message: '请填写 Reuters 代码' }] : undefined}
        >
          <Input placeholder="如 USDCNY=" disabled={!reutersConnected} />
        </Form.Item>

        <Form.Item label="接入英为财经" name="investingConnected" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item
          label="英为财经代码"
          name="investingCode"
          extra="对应 investing.com 货币对 slug，如 usd-cny"
          rules={investingConnected ? [{ required: true, message: '请填写英为财经代码' }] : undefined}
        >
          <Input placeholder="如 usd-cny" disabled={!investingConnected} />
        </Form.Item>

        <Form.Item
          label="报价数据源"
          name="quoteSource"
          extra="业务报价汇率的 7 日均价只使用这一路行情"
          rules={[{ required: true, message: '请选择报价数据源' }]}
        >
          <Select
            placeholder="请选择"
            options={quoteOptions}
            disabled={quoteOptions.length === 0}
          />
        </Form.Item>
      </Form>
      {editing ? null : (
        <Text type="secondary">新增后会为已接入的数据源生成模拟行情，可在汇率数据中查看。</Text>
      )}
    </Modal>
  );
}
