import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Login } from '../pages/Login';
import { CounterBilling } from '../pages/CounterBilling';
import { StockIn } from '../pages/StockIn';
import { StockAudit } from '../pages/StockAudit';
import { MasterLayout } from '../layouts/MasterLayout';
import { ProtectedRoute } from './ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MasterLayout />,
        children: [
          {
            path: '/',
            element: <Navigate to="/billing" replace />,
          },
          {
            path: '/billing',
            element: <CounterBilling />,
          },
          {
            path: '/stock-in',
            element: <StockIn />,
          },
          {
            path: '/audit',
            element: <StockAudit />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/billing" replace />,
  },
]);
