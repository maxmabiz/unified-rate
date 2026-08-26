import { useEffect } from 'react';
import { Form, Modal, Select, Typography } from 'antd';
import { RATE_SOURCE_LABEL } from '@/constants';
import type { EnrichedPair, RateSource } from '@/types';
import { connectedSources } from '@/utils/source';

const { Paragraph } = Typography;

interface ChangeSourceModalProps {
  open: boolean;
  pair: EnrichedPair | null;
  onCancel: () => void;
  onSubmit: (source: RateSource) => void;
}

export default function ChangeSourceModal({ open, pair, onCancel, onSubmit }: ChangeSourceModalProps) {
  const [form] = Form.useForm<{ quoteSource: RateSource }>();

  useEffect(() => {
    if (!open || !pair) return;
    form.setFieldsValue({ quoteSource: pair.quoteSource });
  }, [form, open, pair]);

  const options = (pair ? connectedSources(pair) : []).map((source) => ({
    value: source,
    label: RATE_SOURCE_LABEL[source],
  }));

  return (
    <Modal
      title={pair ? `更改数据源 · ${pair.pairLabel}` : '更改数据源'}
      open={open}
      onCancel={onCancel}
      onOk={() => void form.submit()}
      okText="保存"
      cancelText="取消"
      destroyOnHidden
    >
      <Paragraph type="secondary">
        保存后不会立刻重算当天报价。下次重新计算，或同步报价源成功时，将按新数据源生成当天报价；已锁定的历史日保持不变。
      </Paragraph>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => onSubmit(values.quoteSource)}
      >
        <Form.Item
          label="报价数据源"
          name="quoteSource"
          rules={[{ required: true, message: '请选择报价数据源' }]}
        >
          <Select
            placeholder="请选择"
            options={options}
            getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
