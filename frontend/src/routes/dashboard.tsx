import { createRoute } from '@tanstack/react-router';
import { workspaceLayoutRoute } from './__root';
import { DashboardPage } from './dashboard.lazy';

function DashboardWrapper() {
  return <DashboardPage />;
}

export const dashboardRoute = createRoute({
  getParentRoute: () => workspaceLayoutRoute,
  path: 'dashboard',
  component: DashboardWrapper,
});
