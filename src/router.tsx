import {
  createHashRouter,
  RouteObject,
  Navigate,
} from 'react-router';

import App from './App';
import DawnCon from './pages/DawnCon';
import Dash from './pages/Dash';

const isAuthenticated = false; // Replace with real authentication check

const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/dawncon',
    element: <DawnCon />,
  },
  {
    path: '/dash',
    element: isAuthenticated ? <Dash /> : <Navigate to="/" />,
  },
];

export const router = createHashRouter(routes);
