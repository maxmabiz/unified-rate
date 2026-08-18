import { RouterProvider } from 'react-router-dom';
import { App as AntApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { RateProvider } from '@/store/RateStore';
import { router } from '@/router';

dayjs.locale('zh-cn');

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
          fontSize: 16,
          fontSizeLG: 18,
          fontSizeSM: 14,
          controlHeight: 36,
        },
        components: {
          Table: {
            headerBg: '#fafafa',
            cellPaddingBlock: 14,
            cellPaddingInline: 16,
          },
        },
      }}
    >
      <AntApp>
        <RateProvider>
          <RouterProvider router={router} />
        </RateProvider>
      </AntApp>
    </ConfigProvider>
  );
}
