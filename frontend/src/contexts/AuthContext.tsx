import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'super_admin' | 'admin' | 'user';
  loginMethod: 'google' | 'password' | 'demo';
  isDemo?: boolean;
}

export interface Instance {
  id: string;
  name: string;
  platform: 'cloudflare' | 'railway' | 'digitalocean' | 'hostinger' | 'self_hosted';
  instanceUrl: string;
  status: 'pending' | 'connected' | 'error' | 'suspended';
  connectedAt?: string;
  lastHeartbeat?: string;
}

interface AuthContextType {
  user: User | null;
  instances: Instance[];
  currentInstance: Instance | null;
  allUsers: User[]; // Only populated for super_admin
  isLoading: boolean;
  login: (credential: string) => void;
  loginAsSuperAdmin: () => void;
  loginAsDemo: () => void;
  logout: () => void;
  selectInstance: (instance: Instance | null) => void;
  addInstance: (instance: Instance) => void;
  getAllUsers: () => User[]; // Only works for super_admin
  setUserFromApi: (userData: User, token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dummy users for super admin to view
const DUMMY_USERS: User[] = [
  {
    id: 'google-1',
    email: 'john@example.com',
    name: 'John Doe',
    avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=random',
    role: 'user',
    loginMethod: 'google',
  },
  {
    id: 'google-2',
    email: 'sarah@example.com',
    name: 'Sarah Smith',
    avatar: 'https://ui-avatars.com/api/?name=Sarah+Smith&background=random',
    role: 'user',
    loginMethod: 'google',
  },
  {
    id: 'google-3',
    email: 'mike@example.com',
    name: 'Mike Johnson',
    avatar: 'https://ui-avatars.com/api/?name=Mike+Johnson&background=random',
    role: 'admin',
    loginMethod: 'google',
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [currentInstance, setCurrentInstance] = useState<Instance | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('heyclaw_user');
    const savedInstances = localStorage.getItem('heyclaw_instances');
    const savedCurrentInstance = localStorage.getItem('heyclaw_current_instance');
    const savedAllUsers = localStorage.getItem('heyclaw_all_users');
    
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        
        // If super admin, load all users
        if (parsedUser.role === 'super_admin') {
          if (savedAllUsers) {
            setAllUsers(JSON.parse(savedAllUsers));
          } else {
            setAllUsers(DUMMY_USERS);
            localStorage.setItem('heyclaw_all_users', JSON.stringify(DUMMY_USERS));
          }
        }
      } catch (e) {
        console.error('Failed to parse user:', e);
      }
    }
    
    if (savedInstances) {
      try {
        setInstances(JSON.parse(savedInstances));
      } catch (e) {
        console.error('Failed to parse instances:', e);
      }
    }
    
    if (savedCurrentInstance) {
      try {
        setCurrentInstance(JSON.parse(savedCurrentInstance));
      } catch (e) {
        console.error('Failed to parse current instance:', e);
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = (credential: string) => {
    try {
      const decoded = jwtDecode<{
        sub: string;
        email: string;
        name: string;
        picture?: string;
      }>(credential);

      const newUser: User = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        avatar: decoded.picture,
        role: 'user', // Google OAuth users are regular users
        loginMethod: 'google',
      };

      setUser(newUser);
      setAllUsers([]); // Regular users don't see other users
      localStorage.setItem('heyclaw_user', JSON.stringify(newUser));
    } catch (error) {
      console.error('Failed to decode credential:', error);
    }
  };

  const loginAsSuperAdmin = () => {
    const superAdmin: User = {
      id: 'super-admin-1',
      email: 'admin@heyclaw.com',
      name: 'Super Admin',
      avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=6366f1&color=fff',
      role: 'super_admin',
      loginMethod: 'password',
    };

    setUser(superAdmin);
    setAllUsers(DUMMY_USERS);
    localStorage.setItem('heyclaw_user', JSON.stringify(superAdmin));
    localStorage.setItem('heyclaw_all_users', JSON.stringify(DUMMY_USERS));
  };

  const loginAsDemo = async () => {
    // This is now handled by the API
    // The demo login modal will call demoLogin() from api.ts
    // and then update the context
    return;
  };

  const logout = () => {
    setUser(null);
    setInstances([]);
    setCurrentInstance(null);
    setAllUsers([]);
    localStorage.removeItem('heyclaw_user');
    localStorage.removeItem('heyclaw_token');
    localStorage.removeItem('heyclaw_instances');
    localStorage.removeItem('heyclaw_current_instance');
    localStorage.removeItem('heyclaw_all_users');
  };
  
  // Helper to set user after API login
  const setUserFromApi = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('heyclaw_user', JSON.stringify(userData));
    localStorage.setItem('heyclaw_token', token);
  };

  const selectInstance = (instance: Instance | null) => {
    setCurrentInstance(instance);
    if (instance) {
      localStorage.setItem('heyclaw_current_instance', JSON.stringify(instance));
    } else {
      localStorage.removeItem('heyclaw_current_instance');
    }
  };

  const addInstance = (instance: Instance) => {
    const updatedInstances = [...instances, instance];
    setInstances(updatedInstances);
    localStorage.setItem('heyclaw_instances', JSON.stringify(updatedInstances));
    setCurrentInstance(instance);
    localStorage.setItem('heyclaw_current_instance', JSON.stringify(instance));
  };

  const getAllUsers = () => {
    if (user?.role === 'super_admin') {
      return allUsers;
    }
    return []; // Regular users can't see other users
  };

  const contextValue = useMemo(
    () => ({
      user,
      instances,
      currentInstance,
      allUsers,
      isLoading,
      login,
      loginAsSuperAdmin,
      loginAsDemo,
      logout,
      setUserFromApi,
      selectInstance,
      addInstance,
      getAllUsers,
    }),
    [user, instances, currentInstance, allUsers, isLoading]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
