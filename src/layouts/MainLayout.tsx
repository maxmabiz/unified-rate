import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Layout, Menu, Space, Tag, Typography, theme } from 'antd';
import { LineChartOutlined, SwapOutlined, UserOutlined } from '@ant-design/icons';
import { APP_VERSION, APP_VERSION_DATE, SYSTEM_NAME } from '@/constants';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();

  const menuItems = [
    {
      key: 'unified-rate',
      icon: <LineChartOutlined />,
      label: '统一汇率',
      children: [
        { key: '/unified-rate/data', label: '汇率数据' },
        { key: '/unified-rate/business-rates', label: '业务报价汇率' },
      ],
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={220}>
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: collapsed ? 16 : 18,
            background: token.colorPrimary,
            letterSpacing: 1,
          }}
        >
          {collapsed ? '汇率' : SYSTEM_NAME}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['unified-rate']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          <Space>
            <SwapOutlined style={{ color: token.colorPrimary }} />
            <Text strong style={{ fontSize: 18 }}>资金中台 · 统一汇率管理</Text>
            <Tag color="blue">v{APP_VERSION}</Tag>
            <Text type="secondary">{APP_VERSION_DATE}</Text>
          </Space>
          <Space>
            <Avatar icon={<UserOutlined />} size="small" />
            <div>
              <Text>张财务</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 14 }}>财务操作员</Text>
            </div>
          </Space>
        </Header>
        <Content style={{ margin: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
