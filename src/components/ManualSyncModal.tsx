import { useEffect } from 'react';
import { Checkbox, DatePicker, Form, Modal, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { RATE_SOURCE_LABEL } from '@/constants';
import { RATE_SOURCE_IDS, type DateRange, type RateSource } from '@/types';
import { formatSyncRange, tradingDaysInRange } from '@/utils/date';

const { RangePicker } = DatePicker;
const { Paragraph, Text } = Typography;

interface ManualSyncModalProps {
  open: boolean;
  loading?: boolean;
  defaultRange?: DateRange;
  pairCount: number;
  onCancel: () => void;
  onOk: (range: DateRange, sources: RateSource[]) => void;
}

export default function ManualSyncModal({
  open,
  loading,
  defaultRange,
  pairCount,
  onCancel,
  onOk,
}: ManualSyncModalProps) {
  const [form] = Form.useForm<{ period: [Dayjs, Dayjs]; sources: RateSource[] }>();
  const period = Form.useWatch('period', form);
  const sources = Form.useWatch('sources', form) ?? [];
  const start = period?.[0]?.format('YYYY-MM-DD');
  const end = period?.[1]?.format('YYYY-MM-DD');
  const tradingDays = start && end ? tradingDaysInRange(start, end) : [];

  useEffect(() => {
    if (!open) return;
    const startDate = defaultRange?.start ?? dayjs().format('YYYY-MM-DD');
    const endDate = defaultRange?.end ?? startDate;
    form.setFieldsValue({
      period: [dayjs(startDate), dayjs(endDate)],
      sources: [...RATE_SOURCE_IDS],
    });
  }, [defaultRange, form, open]);

  return (
    <Modal
      title="手动同步全天数据"
      open={open}
      onCancel={onCancel}
      onOk={() => void form.submit()}
      okText="开始同步"
      confirmLoading={loading}
      okButtonProps={{ disabled: tradingDays.length === 0 || sources.length === 0 }}
      maskClosable={!loading}
      keyboard={!loading}
      destroyOnHidden
    >
      <Paragraph type="secondary">
        按所选数据源同步时间段内全部已启用、已接入的货币对。两路行情分别记账，一路失败不影响另一路已有数据。
      </Paragraph>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          onOk(
            {
              start: values.period[0].format('YYYY-MM-DD'),
              end: values.period[1].format('YYYY-MM-DD'),
            },
            values.sources,
          );
        }}
      >
        <Form.Item
          label="数据源"
          name="sources"
          rules={[{ required: true, message: '请选择至少一个数据源' }]}
        >
          <Checkbox.Group
            disabled={loading}
            options={RATE_SOURCE_IDS.map((source) => ({
              value: source,
              label: RATE_SOURCE_LABEL[source],
            }))}
          />
        </Form.Item>
        <Form.Item
          label="同步时间段"
          name="period"
          rules={[
            { required: true, message: '请选择同步时间段' },
            {
              validator: async (_, value?: [Dayjs, Dayjs]) => {
                if (!value?.[0] || !value?.[1]) return;
                const days = tradingDaysInRange(
                  value[0].format('YYYY-MM-DD'),
                  value[1].format('YYYY-MM-DD'),
                );
                if (days.length === 0) {
                  throw new Error('所选时间段内没有交易日');
                }
              },
            },
          ]}
        >
          <RangePicker
            style={{ width: '100%' }}
            allowClear={false}
            disabled={loading}
            disabledDate={(current) => current.isAfter(dayjs(), 'day')}
          />
        </Form.Item>
      </Form>
      <Text type="secondary">
        {tradingDays.length > 0 && sources.length > 0
          ? `将同步 ${formatSyncRange(start, end)}，共 ${tradingDays.length} 个交易日、${pairCount} 个货币对、${sources.length} 个数据源。`
          : '请选择有效时间段和数据源。'}
      </Text>
    </Modal>
  );
}
