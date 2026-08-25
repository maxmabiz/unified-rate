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
          fontSize: 14,
          fontSizeLG: 16,
          fontSizeSM: 12,
          controlHeight: 32,
          colorBgLayout: '#f5f6f8',
        },
        components: {
          Layout: {
            headerHeight: 52,
            headerBg: '#fff',
            siderBg: '#001529',
          },
          Table: {
            headerBg: '#f7f8fa',
            headerColor: 'rgba(0, 0, 0, 0.65)',
            headerSplitColor: '#f0f0f0',
            cellPaddingBlock: 10,
            cellPaddingInline: 12,
            fontSize: 13,
          },
          Card: {
            paddingLG: 20,
          },
          Menu: {
            darkItemBg: '#001529',
            darkSubMenuItemBg: '#000c17',
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
