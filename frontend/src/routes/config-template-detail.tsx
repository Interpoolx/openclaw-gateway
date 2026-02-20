import { createRoute } from '@tanstack/react-router';
import { TemplateDetailPage } from '../components/config-builder/TemplateDetailPage';
import { rootRoute } from './__root';

export const configTemplateDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/config-builder/templates/$templateSlug',
  component: ConfigTemplateDetailRouteComponent,
}) as any;

function ConfigTemplateDetailRouteComponent() {
  const params = configTemplateDetailRoute.useParams();

  return <TemplateDetailPage templateSlug={params.templateSlug} />;
}
