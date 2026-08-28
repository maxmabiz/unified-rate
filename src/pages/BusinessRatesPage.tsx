import { useMemo, useState } from 'react';
import { App, Button, Card, DatePicker, Form, Modal, Select, Space, Table, Tooltip, Typography } from 'antd';
import { CalculatorOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import BufferConfigModal from '@/components/BufferConfigModal';
import CalcRuleModal from '@/components/CalcRuleModal';
import { CustomBufferTag, EffectiveTag, LockedTag, SourceTag } from '@/components/StatusTags';
import { useRateStore } from '@/store/RateStore';
import type { BufferConfig, OfficialQuote } from '@/types';
import { customDayQuoteCount, isCustomDayQuote } from '@/utils/buffer';
import { formatDateTime } from '@/utils/date';
import { isQuoteLocked, latestQuoteDate, quoteWindowLabel } from '@/utils/officialQuote';
import { combinedBufferOf, formatPercent, formatRate } from '@/utils/rateCalc';

const { Title, Paragraph } = Typography;

type QuoteStatusFilter = 'effective' | 'locked';

interface Filters {
  currency1?: string;
  currency2?: string;
  pair?: string;
  quoteDate?: string;
  status?: QuoteStatusFilter;
}

export default function BusinessRatesPage() {
  const { message } = App.useApp();
  const {
    pairs,
    officialQuotes,
    unlockedQuoteDate,
    lastCalculatedAt,
    globalBuffer,
    calculating,
    recalculate,
    saveGlobalBuffer,
    savePairBuffer,
    restorePairBuffer,
  } = useRateStore();
  const [form] = Form.useForm();
  const [filters, setFilters] = useState<Filters>({});
  const [bufferOpen, setBufferOpen] = useState(false);
  const [bufferQuote, setBufferQuote] = useState<OfficialQuote | null>(null);
  const [recalcOpen, setRecalcOpen] = useState(false);
  const [ruleQuote, setRuleQuote] = useState<OfficialQuote | null>(null);

  const quotePairs = useMemo(() => pairs.filter((item) => item.enabled), [pairs]);
  const latestDate = unlockedQuoteDate ?? latestQuoteDate(officialQuotes);
  const enabledCount = quotePairs.length;
  const openDayExceptionCount = customDayQuoteCount(officialQuotes, latestDate);

  const quoteDates = useMemo(
    () => [...new Set(officialQuotes.map((item) => item.quoteDate))].sort(),
    [officialQuotes],
  );

  const pairById = useMemo(() => new Map(pairs.map((item) => [item.id, item])), [pairs]);

  const selectedQuoteDate = filters.quoteDate === undefined ? latestDate : filters.quoteDate || undefined;

  const currencies1 = [...new Set(officialQuotes.map((item) => item.currency1))];
  const currencies2 = [...new Set(officialQuotes.map((item) => item.currency2))];
  const pairOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of officialQuotes) {
      seen.set(item.pair, item.pairLabel);
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [officialQuotes]);

  const filtered = useMemo(() => {
    return officialQuotes.filter((item) => {
      if (filters.currency1 && item.currency1 !== filters.currency1) return false;
      if (filters.currency2 && item.currency2 !== filters.currency2) return false;
      if (filters.pair && item.pair !== filters.pair) return false;
      if (selectedQuoteDate && item.quoteDate !== selectedQuoteDate) return false;
      if (filters.status === 'effective' && isQuoteLocked(item.quoteDate, unlockedQuoteDate)) return false;
      if (filters.status === 'locked' && !isQuoteLocked(item.quoteDate, unlockedQuoteDate)) return false;
      const pair = pairById.get(item.pairId);
      if (item.quoteDate === latestDate && pair && !pair.enabled) return false;
      return true;
    });
  }, [filters, officialQuotes, selectedQuoteDate, pairById, latestDate, unlockedQuoteDate]);

  const viewedDate = selectedQuoteDate ?? latestDate;
  const viewedExceptionCount = customDayQuoteCount(officialQuotes, viewedDate);
  const globalPreviewQuotes = useMemo(
    () =>
      officialQuotes.filter((item) => {
        if (item.quoteDate !== latestDate || isCustomDayQuote(item)) return false;
        return pairById.get(item.pairId)?.enabled;
      }),
    [officialQuotes, latestDate, pairById],
  );

  const metaDateLabel = selectedQuoteDate
    ? `${selectedQuoteDate}${isQuoteLocked(selectedQuoteDate, unlockedQuoteDate) ? '（已锁定）' : ''}`
    : filters.quoteDate === ''
      ? '全部'
      : (latestDate ?? '-');
  const metaQuote = filtered[0] ?? officialQuotes.find((item) => item.quoteDate === (selectedQuoteDate || latestDate));
  const metaCalculatedAt = selectedQuoteDate && selectedQuoteDate !== latestDate
    ? metaQuote?.calculatedAt
    : lastCalculatedAt;

  const handleSaveGlobal = (config: BufferConfig) => {
    saveGlobalBuffer(config);
    setBufferOpen(false);
    message.success('已保存全局缓冲因子。点击「重新计算」后，当天跟随全局的报价才会更新');
  };

  const handleSavePair = (config: BufferConfig) => {
    if (!bufferQuote) return;
    savePairBuffer(bufferQuote.pairId, config);
    setBufferQuote(null);
    message.success(`已调整 ${bufferQuote.pairLabel} 当天有效报价，下一报价日仍按全局默认`);
  };

  const handleRestorePair = () => {
    if (!bufferQuote) return;
    restorePairBuffer(bufferQuote.pairId);
    setBufferQuote(null);
    message.success(`${bufferQuote.pairLabel} 当天报价已恢复跟随全局默认`);
  };

  const handleRecalculate = () => {
    recalculate();
    setRecalcOpen(false);
    message.success(
      openDayExceptionCount
        ? `已按 ${latestDate} 行情重算跟随全局的货币对；${openDayExceptionCount} 个当日例外未改动`
        : latestDate
          ? `已按 ${latestDate} 行情重算 ${enabledCount} 个货币对。`
          : '已按当前市场数据和缓冲因子重新计算',
    );
  };

  const columns: ColumnsType<OfficialQuote> = [
    { title: '报价数据日', dataIndex: 'quoteDate', width: 112 },
    {
      title: '货币对',
      dataIndex: 'pairLabel',
      width: 112,
    },
    {
      title: '报价数据源',
      dataIndex: 'quoteSource',
      width: 112,
      render: (source: OfficialQuote['quoteSource']) => <SourceTag source={source} />,
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
      width: 120,
      render: (value: string, record) => {
        const locked = isQuoteLocked(record.quoteDate, unlockedQuoteDate);
        const canEdit = !locked && pairById.has(record.pairId);
        const custom = isCustomDayQuote(record);
        return (
          <span className="buffer-cell">
            <span className="buffer-value">{formatPercent(value)}</span>
            {custom ? (
              <CustomBufferTag onClick={canEdit ? () => setBufferQuote(record) : undefined} />
            ) : canEdit ? (
              <Button type="link" className="buffer-config-link" onClick={() => setBufferQuote(record)}>
                修改
              </Button>
            ) : null}
          </span>
        );
      },
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
      title: '计算时间',
      dataIndex: 'calculatedAt',
      width: 168,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '状态',
      key: 'status',
      width: 88,
      render: (_, record) =>
        isQuoteLocked(record.quoteDate, unlockedQuoteDate) ? <LockedTag /> : <EffectiveTag />,
    },
    {
      title: '操作',
      key: 'action',
      width: 88,
      render: (_, record) => (
        <Button type="link" onClick={() => setRuleQuote(record)}>
          计算规则
        </Button>
      ),
    },
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <Title level={3}>履约报价汇率</Title>
        <Paragraph className="page-desc">
          官方报价按行情日存档。默认查看最新报价日；历史日报价已冻结，仅可查阅。缓冲因子默认跟随全局，当天有效报价可单独配置，不影响下一报价日。
        </Paragraph>
      </div>

      <Card className="page-card" variant="outlined">
        <div className="meta-strip">
          <div className="meta-stats">
            <div className="meta-stat">
              <span className="k">报价数据日</span>
              <span className="v">{metaDateLabel}</span>
            </div>
            <div className="meta-stat">
              <span className="k">近7交易日</span>
              <span className="v">{metaQuote ? quoteWindowLabel(metaQuote.history) : '-'}</span>
            </div>
            <div className="meta-stat">
              <span className="k">最近计算时间</span>
              <span className="v">{formatDateTime(metaCalculatedAt)}</span>
            </div>
            <div className="meta-stat">
              <span className="k">综合缓冲因子</span>
              <span className="v">{formatPercent(combinedBufferOf(globalBuffer))}</span>
            </div>
            {viewedExceptionCount > 0 ? (
              <div className="meta-stat">
                <span className="k">单独配置</span>
                <span className="v">{viewedExceptionCount} 个货币对</span>
              </div>
            ) : null}
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
                disabled={!enabledCount}
                onClick={() => setRecalcOpen(true)}
              >
                重新计算
              </Button>
            </Space>
          </div>
        </div>

        <Form
          className="filter-bar"
          form={form}
          layout="inline"
          colon={false}
          initialValues={{ quoteDate: latestDate ? dayjs(latestDate) : undefined }}
          onFinish={(values: {
            currency1?: string;
            currency2?: string;
            pair?: string;
            quoteDate?: Dayjs;
            status?: QuoteStatusFilter;
          }) => {
            setFilters({
              currency1: values.currency1,
              currency2: values.currency2,
              pair: values.pair,
              quoteDate: values.quoteDate ? values.quoteDate.format('YYYY-MM-DD') : '',
              status: values.status,
            });
          }}
        >
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
            <Select allowClear placeholder="全部" style={{ width: 148 }} options={pairOptions} />
          </Form.Item>
          <Form.Item name="quoteDate" label="报价日期">
            <DatePicker
              style={{ width: 148 }}
              allowClear
              disabledDate={(date) => !quoteDates.includes(date.format('YYYY-MM-DD'))}
            />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              allowClear
              placeholder="全部"
              style={{ width: 120 }}
              options={[
                { value: 'effective', label: '有效' },
                { value: 'locked', label: '已锁定' },
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
                  form.setFieldsValue({ quoteDate: latestDate ? dayjs(latestDate) : undefined });
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
          scroll={{ x: 1180 }}
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
        previewQuotes={globalPreviewQuotes}
        initial={globalBuffer}
        exceptionCount={openDayExceptionCount}
        onCancel={() => setBufferOpen(false)}
        onSave={handleSaveGlobal}
      />
      <BufferConfigModal
        open={!!bufferQuote}
        quote={bufferQuote}
        previewQuotes={[]}
        initial={
          bufferQuote
            ? { volatilityBuffer: bufferQuote.volatilityBuffer, fee: bufferQuote.fee }
            : globalBuffer
        }
        onCancel={() => setBufferQuote(null)}
        onSave={handleSavePair}
        onRestore={handleRestorePair}
      />
      <Modal
        title="重新计算当前报价日？"
        open={recalcOpen}
        onCancel={() => setRecalcOpen(false)}
        onOk={handleRecalculate}
        okText="重算"
        cancelText="取消"
        confirmLoading={calculating}
        destroyOnHidden
      >
        <Paragraph>
          {latestDate
            ? `将按各货币对报价数据源截至 ${latestDate} 的近 7 个交易日均价，重算当天仍跟随全局的货币对${
                openDayExceptionCount ? `（${enabledCount - openDayExceptionCount} 个）` : `（${enabledCount} 个）`
              }。`
            : '将按当前市场数据和缓冲因子重算全部已启用货币对。'}
        </Paragraph>
        {latestDate ? (
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            仅更新 {latestDate} 的官方报价，已锁定的历史日不会改写。
            {openDayExceptionCount ? ` ${openDayExceptionCount} 个当日例外不会被覆盖。` : ''}
          </Paragraph>
        ) : null}
      </Modal>
      <CalcRuleModal open={!!ruleQuote} quote={ruleQuote} onClose={() => setRuleQuote(null)} />
    </div>
  );
}
