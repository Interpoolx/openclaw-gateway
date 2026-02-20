import { createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { WorkspaceProvider, useWorkspace } from '../contexts/WorkspaceContext';
import { ProjectProvider } from '../contexts/ProjectContext';
import { Layout } from '../components/Layout';
import { SeoManager } from '../components/SeoManager';

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider>
        <SeoManager />
        <Outlet />
      </WorkspaceProvider>
    </QueryClientProvider>
  );
}



function WorkspaceLayoutComponent() {
  const { currentWorkspaceId, isLoading } = useWorkspace();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--color-bg-primary)]">
        <span className="text-[#666]">Loading workspace...</span>
      </div>
    );
  }

  if (!currentWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[var(--color-bg-primary)] gap-4">
        <span className="text-[#888] text-[18px]">Select a workspace to continue</span>
      </div>
    );
  }

  return (
    <ProjectProvider>
      <Layout>
        <Outlet />
      </Layout>
    </ProjectProvider>
  );
}

export const rootRoute = createRootRoute({
  component: RootComponent,
});



export const workspaceLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$workspaceSlug',
  component: WorkspaceLayoutComponent,
});
