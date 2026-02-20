import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api';
import { useWorkspace } from './WorkspaceContext';

export interface Project {
    id: string;
    workspaceId: string;
    userId: string;
    name: string;
    slug: string;
    description?: string;
    category: string;
    status: string;
    progress: number;
    priority: string;
    totalTasks: number;
    completedTasks: number;
    estimatedTokens: number;
    usedTokens: number;
    estimatedCost: number;
    actualCost: number;
    timeSpent: number;
    agentIds: string;
    tags: string;
    startedAt?: string;
    completedAt?: string;
    dueDate?: string;
    createdAt: string;
    updatedAt: string;
    agentNames?: string[];
    recentCommits?: number;
    recentDevlogs?: number;
}

export interface ProjectStats {
    total: number;
    active: number;
    completed: number;
    totalProgress: number;
    totalCost: number;
    totalTime: number;
}

interface ProjectContextType {
    projects: Project[];
    currentProject: Project | null;
    stats: ProjectStats | null;
    isLoading: boolean;
    error: string | null;
    fetchProjects: (filters?: { status?: string; category?: string }) => Promise<void>;
    fetchProject: (id: string) => Promise<Project>;
    createProject: (data: CreateProjectData) => Promise<Project>;
    updateProject: (id: string, data: Partial<Project>) => Promise<Project>;
    deleteProject: (id: string) => Promise<void>;
    fetchStats: () => Promise<void>;
    setCurrentProject: (project: Project | null) => void;
}

interface CreateProjectData {
    name: string;
    slug?: string;
    description?: string;
    category?: string;
    priority?: string;
    dueDate?: string;
    agentIds?: string[];
    tags?: string[];
    estimatedTokens?: number;
    estimatedCost?: number;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const { currentWorkspace } = useWorkspace();
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [stats, setStats] = useState<ProjectStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const apiCall = useCallback(async <T,>(
        url: string,
        method: 'get' | 'post' | 'patch' | 'delete',
        data?: any
    ): Promise<T> => {
        if (method === 'get') return await apiGet<T>(url);
        if (method === 'post') return await apiPost<T>(url, data);
        if (method === 'patch') return await apiPatch<T>(url, data);
        if (method === 'delete') return await apiDelete<T>(url);
        throw new Error(`Unsupported method: ${method}`);
    }, []);

    const fetchProjects = useCallback(async (filters?: { status?: string; category?: string }) => {
        if (!currentWorkspace) return;

        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({ workspaceId: currentWorkspace.id });
            if (filters?.status) params.append('status', filters.status);
            if (filters?.category) params.append('category', filters.category);

            const queryString = params.toString();
            const projects = await apiCall<Project[]>(`/projects?${queryString}`, 'get');
            setProjects(Array.isArray(projects) ? projects : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch projects');
        } finally {
            setIsLoading(false);
        }
    }, [currentWorkspace, apiCall]);

    const fetchProject = useCallback(async (id: string): Promise<Project> => {
        if (!currentWorkspace) throw new Error('No workspace selected');

        setIsLoading(true);
        setError(null);

        try {
            const project = await apiCall<Project>(`/projects/${id}?workspaceId=${currentWorkspace.id}`, 'get');
            setCurrentProject(project);
            return project;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch project');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [currentWorkspace, apiCall]);

    const createProject = useCallback(async (data: CreateProjectData): Promise<Project> => {
        if (!currentWorkspace) throw new Error('No workspace selected');

        setIsLoading(true);
        setError(null);

        try {
            const newProject = await apiCall<Project>('/projects', 'post', {
                ...data,
                workspaceId: currentWorkspace.id,
            });

            setProjects(prev => [newProject, ...prev]);
            return newProject;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create project');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [currentWorkspace, apiCall]);

    const updateProject = useCallback(async (id: string, data: Partial<Project>): Promise<Project> => {
        if (!currentWorkspace) throw new Error('No workspace selected');

        setIsLoading(true);
        setError(null);

        try {
            const updated = await apiCall<Project>(`/projects/${id}`, 'patch', {
                ...data,
                workspaceId: currentWorkspace.id,
            });

            setProjects(prev => prev.map(p => p.id === id ? updated : p));

            if (currentProject?.id === id) {
                setCurrentProject(updated);
            }

            return updated;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update project');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [currentWorkspace, currentProject?.id, apiCall]);

    const deleteProject = useCallback(async (id: string): Promise<void> => {
        if (!currentWorkspace) throw new Error('No workspace selected');

        setIsLoading(true);
        setError(null);

        try {
            await apiCall(`/projects/${id}?workspaceId=${currentWorkspace.id}`, 'delete');

            setProjects(prev => prev.filter(p => p.id !== id));

            if (currentProject?.id === id) {
                setCurrentProject(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete project');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [currentWorkspace, currentProject?.id, apiCall]);

    const fetchStats = useCallback(async () => {
        if (!currentWorkspace) return;

        try {
            const stats = await apiCall<ProjectStats>(`/projects/stats/dashboard?workspaceId=${currentWorkspace.id}`, 'get');
            setStats(stats);
        } catch (err) {
            console.error('Failed to fetch project stats:', err);
        }
    }, [currentWorkspace, apiCall]);

    // Fetch projects when workspace changes
    useEffect(() => {
        if (currentWorkspace) {
            fetchProjects();
            fetchStats();
        }
    }, [currentWorkspace, fetchProjects, fetchStats]);

    const value: ProjectContextType = {
        projects,
        currentProject,
        stats,
        isLoading,
        error,
        fetchProjects,
        fetchProject,
        createProject,
        updateProject,
        deleteProject,
        fetchStats,
        setCurrentProject,
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProjects() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
}
