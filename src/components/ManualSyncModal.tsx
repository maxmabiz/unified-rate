import { useEffect } from 'react';
import { DatePicker, Form, Modal, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { DateRange } from '@/types';
import { formatSyncRange, tradingDaysInRange } from '@/utils/date';

const { RangePicker } = DatePicker;
const { Paragraph, Text } = Typography;

interface ManualSyncModalProps {
  open: boolean;
  loading?: boolean;
  defaultRange?: DateRange;
  pairCount: number;
  onCancel: () => void;
  onOk: (range: DateRange) => void;
}

export default function ManualSyncModal({
  open,
  loading,
  defaultRange,
  pairCount,
  onCancel,
  onOk,
}: ManualSyncModalProps) {
  const [form] = Form.useForm<{ period: [Dayjs, Dayjs] }>();
  const period = Form.useWatch('period', form);
  const start = period?.[0]?.format('YYYY-MM-DD');
  const end = period?.[1]?.format('YYYY-MM-DD');
  const tradingDays = start && end ? tradingDaysInRange(start, end) : [];

  useEffect(() => {
    if (!open) return;
    const startDate = defaultRange?.start ?? dayjs().format('YYYY-MM-DD');
    const endDate = defaultRange?.end ?? startDate;
    form.setFieldsValue({
      period: [dayjs(startDate), dayjs(endDate)],
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
      okButtonProps={{ disabled: tradingDays.length === 0 }}
      maskClosable={!loading}
      keyboard={!loading}
      destroyOnHidden
    >
      <Paragraph type="secondary">
        将按 Reuters 全天行情，同步所选时间段内全部货币对。
      </Paragraph>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          onOk({
            start: values.period[0].format('YYYY-MM-DD'),
            end: values.period[1].format('YYYY-MM-DD'),
          });
        }}
      >
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
        {tradingDays.length > 0
          ? `将同步 ${formatSyncRange(start, end)}，共 ${tradingDays.length} 个交易日、${pairCount} 个货币对。`
          : '所选时间段内没有交易日。'}
      </Text>
    </Modal>
  );
}
