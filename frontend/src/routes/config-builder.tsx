import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { ConfigBuilderPage } from '../components/config-builder/ConfigBuilderPage';

export const configBuilderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/config-builder',
  component: ConfigBuilderPage,
}) as any;

