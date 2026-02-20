import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

function DashboardRedirect() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentWorkspace?.slug) {
      navigate({
        to: '/$workspaceSlug/dashboard',
        params: { workspaceSlug: currentWorkspace.slug },
        replace: true,
      });
    }
  }, [currentWorkspace?.slug, navigate]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--color-bg-primary)',
    }}>
      <span style={{ color: '#666' }}>Redirecting to workspace dashboard...</span>
    </div>
  );
}

export const dashboardRedirectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardRedirect,
});
