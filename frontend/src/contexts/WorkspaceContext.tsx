import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  gatewayUrl?: string;
  gatewayToken?: string;
  settings: string;
  tier: 'free' | 'pro' | 'enterprise';
  isDefault: boolean;
  avatar?: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
  invitedBy?: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentWorkspaceId: string | null;
  memberRole: string | null;
  isLoading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace) => Promise<void>;
  setCurrentWorkspaceById: (id: string) => Promise<void>;
  createWorkspace: (data: CreateWorkspaceData) => Promise<Workspace>;
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<Workspace>;
  deleteWorkspace: (id: string) => Promise<void>;
  getWorkspaceMembers: (id: string) => Promise<Array<{ member: WorkspaceMember; user: any }>>;
  inviteMember: (workspaceId: string, userId: string, role?: string) => Promise<void>;
  removeMember: (workspaceId: string, userId: string) => Promise<void>;
  updateMemberRole: (workspaceId: string, userId: string, role: string) => Promise<void>;
  hasPermission: (requiredRole: 'viewer' | 'member' | 'admin' | 'owner') => boolean;
}

interface CreateWorkspaceData {
  name: string;
  slug: string;
  description?: string;
  gatewayUrl?: string;
  gatewayToken?: string;
  avatar?: string;
  color?: string;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const roleHierarchy: Record<string, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const currentWorkspaceId = currentWorkspace?.id ?? null;

  const setCurrentWorkspaceById = useCallback(async (id: string) => {
    const workspace = workspaces.find(w => w.id === id);
    if (workspace) {
      await navigate({ to: '/$workspaceSlug/dashboard', params: { workspaceSlug: workspace.slug } });
    }
  }, [workspaces, navigate]);

  const fetchWorkspaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiGet<{
        workspaces: Workspace[];
        currentWorkspace: Workspace | null;
      }>('/workspaces');

      const workspacesList = (data as any)?.workspaces || [];
      const safeWorkspaces = Array.isArray(workspacesList) ? workspacesList : [];
      setWorkspaces(safeWorkspaces);

      if (data && (data as any).currentWorkspace) {
        const currentWS = (data as any).currentWorkspace;
        setCurrentWorkspaceState(currentWS);
        // Find member role for current workspace
        const current = safeWorkspaces.find(
          (w: Workspace) => w.id === currentWS.id
        );
        // We'll need to fetch the member role separately
        if (current) {
          const workspaceRes = await apiGet<{
            workspace: Workspace;
            memberRole: string;
          }>(`/workspaces/${current.slug}`);
          if (workspaceRes && (workspaceRes as any).memberRole) {
            setMemberRole((workspaceRes as any).memberRole);
          }
        }
      } else if (safeWorkspaces.length > 0) {
        // Set first workspace as current if none selected
        const first = safeWorkspaces[0];
        await setCurrentWorkspace(first);
      }
    } catch (err) {
      // Don't set error state - this allows the app to work without backend
      console.warn('[WorkspaceContext] Backend not available, running in limited mode');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setCurrentWorkspace = useCallback(async (workspace: Workspace) => {
    setIsLoading(true);
    setError(null);

    try {
      await apiPost(`/workspaces/${workspace.id}/set-current`);
      setCurrentWorkspaceState(workspace);

      const data = await apiGet<{ workspace: Workspace; memberRole: string }>(`/workspaces/${workspace.slug}`);
      if (data && (data as any).memberRole) {
        setMemberRole((data as any).memberRole);
      }

      navigate({ to: '/$workspaceSlug/dashboard', params: { workspaceSlug: workspace.slug } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set workspace');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const createWorkspace = useCallback(async (data: CreateWorkspaceData): Promise<Workspace> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiPost<any>('/workspaces', data);
      const newWorkspace = res.workspace || res;

      setWorkspaces(prev => [...prev, newWorkspace]);

      // Set as current if it's the first workspace
      if (workspaces.length === 0) {
        await setCurrentWorkspace(newWorkspace);
      }

      return newWorkspace;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [workspaces.length, setCurrentWorkspace]);

  const updateWorkspace = useCallback(async (id: string, data: Partial<Workspace>): Promise<Workspace> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiPatch<any>(`/workspaces/${id}`, data);
      const updated = res.workspace || res;

      setWorkspaces(prev =>
        prev.map(w => (w.id === id ? updated : w))
      );

      if (currentWorkspace?.id === id) {
        setCurrentWorkspaceState(updated);
      }

      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workspace');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  const deleteWorkspace = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await apiDelete(`/workspaces/${id}`);

      setWorkspaces(prev => prev.filter(w => w.id !== id));

      if (currentWorkspace?.id === id) {
        const remaining = workspaces.filter(w => w.id !== id);
        if (remaining.length > 0) {
          await setCurrentWorkspace(remaining[0]);
        } else {
          setCurrentWorkspaceState(null);
          setMemberRole(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workspace');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, workspaces, setCurrentWorkspace]);

  const getWorkspaceMembers = useCallback(async (id: string) => {
    const members = await apiGet<Array<{ member: WorkspaceMember; user: any }>>(`/workspaces/${id}/members`);
    return members;
  }, []);

  const inviteMember = useCallback(async (workspaceId: string, userId: string, role: string = 'member') => {
    await apiPost(`/workspaces/${workspaceId}/members`, { userId, role });
  }, []);

  const removeMember = useCallback(async (workspaceId: string, userId: string) => {
    await apiDelete(`/workspaces/${workspaceId}/members/${userId}`);
  }, []);

  const updateMemberRole = useCallback(async (workspaceId: string, userId: string, role: string) => {
    await apiPatch(`/workspaces/${workspaceId}/members/${userId}/role`, { role });
  }, []);

  const hasPermission = useCallback((requiredRole: 'viewer' | 'member' | 'admin' | 'owner'): boolean => {
    if (!memberRole) return false;
    return roleHierarchy[memberRole] >= roleHierarchy[requiredRole];
  }, [memberRole]);

  // Fetch workspaces on mount and redirect if needed
  useEffect(() => {
    let isMounted = true;

    const initWorkspaces = async () => {
      try {
        await fetchWorkspaces();

        // If we just fetched and have a current workspace, redirect to it
        // Only redirect if we're on a workspace route that needs a workspace
        if (isMounted && currentWorkspace?.slug) {
          const pathname = window.location.pathname;
          // Only redirect from root or landing pages
          if (pathname === '/' || pathname === '/landing') {
            await navigate({ to: '/$workspaceSlug/dashboard', params: { workspaceSlug: currentWorkspace.slug } });
          }
        }
      } catch (error) {
        // Backend not available - this is expected in development without backend
        // Silently handle - the app will work in limited mode
        console.warn('[WorkspaceContext] Backend not available, running in limited mode');
      }
    };

    initWorkspaces();

    return () => {
      isMounted = false;
    };
  }, []);

  const value: WorkspaceContextType = {
    workspaces,
    currentWorkspace,
    currentWorkspaceId,
    memberRole,
    isLoading,
    error,
    fetchWorkspaces,
    setCurrentWorkspace,
    setCurrentWorkspaceById,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceMembers,
    inviteMember,
    removeMember,
    updateMemberRole,
    hasPermission,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
