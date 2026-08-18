import { Navigate, createBrowserRouter } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import RateDataPage from '@/pages/RateDataPage';
import BusinessRatesPage from '@/pages/BusinessRatesPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/unified-rate/data" replace /> },
      { path: 'unified-rate/data', element: <RateDataPage /> },
      { path: 'unified-rate/business-rates', element: <BusinessRatesPage /> },
      { path: '*', element: <Navigate to="/unified-rate/data" replace /> },
    ],
  },
]);
