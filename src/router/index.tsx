import { Navigate, createBrowserRouter } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import RateDataPage from '@/pages/RateDataPage';
import BusinessRatesPage from '@/pages/BusinessRatesPage';
import PairConfigPage from '@/pages/PairConfigPage';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined;

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <MainLayout />,
      children: [
        { index: true, element: <Navigate to="/pairs" replace /> },
        { path: 'data', element: <RateDataPage /> },
        { path: 'business-rates', element: <BusinessRatesPage /> },
        { path: 'pairs', element: <PairConfigPage /> },
        { path: '*', element: <Navigate to="/pairs" replace /> },
      ],
    },
  ],
  { basename },
);
