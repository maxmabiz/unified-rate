import { useEffect } from 'react';
import { Form, Input, Modal, Select, Typography } from 'antd';
import { CURRENCY_OPTIONS, suggestReutersCode } from '@/constants';
import type { EnrichedPair } from '@/types';

const { Text } = Typography;

export interface PairFormValues {
  currency1: string;
  currency2: string;
  reutersCode: string;
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
  const editing = !!pair;

  useEffect(() => {
    if (!open) return;
    if (pair) {
      form.setFieldsValue({
        currency1: pair.currency1,
        currency2: pair.currency2,
        reutersCode: pair.reutersCode,
      });
      return;
    }
    form.resetFields();
  }, [form, open, pair]);

  useEffect(() => {
    if (!open || editing || !currency1 || !currency2 || currency1 === currency2) return;
    form.setFieldValue('reutersCode', suggestReutersCode(currency1, currency2));
  }, [currency1, currency2, editing, form, open]);

  return (
    <Modal
      title={editing ? `编辑货币对 · ${pair.pairLabel}` : '新增货币对'}
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
        <Form.Item
          label="Reuters代码"
          name="reutersCode"
          rules={[{ required: true, message: '请填写 Reuters 代码' }]}
        >
          <Input placeholder="如 USDCNY=" />
        </Form.Item>
      </Form>
      {editing ? null : (
        <Text type="secondary">新增后会生成模拟行情，可在汇率数据中查看，并立即参与业务报价计算。</Text>
      )}
    </Modal>
  );
}
