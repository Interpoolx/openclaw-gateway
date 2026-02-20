import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { useAuth } from '../contexts/AuthContext';

import { Layout } from '../components/Layout';
import {
  Users,
  Shield,
  Mail,
  MoreVertical,
  Search,
  Filter,
  Crown,
  User as UserIcon,
  AlertCircle
} from 'lucide-react';

export const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  component: UsersPage,
}) as any;

function UsersPage() {
  const { user, getAllUsers } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Only super admin can access this page
  if (!user || user.role !== 'super_admin') {
    return (
      <Layout>
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <div className="w-20 h-20 bg-[rgba(239,68,68,0.1)] rounded-[20px] flex items-center justify-center mb-6">
            <AlertCircle size={40} className="text-[#ef4444]" />
          </div>
          <h1 className="text-[24px] font-semibold mb-3">
            Access Denied
          </h1>
          <p className="text-[15px] text-[#666] text-center max-w-[400px]">
            This page is restricted to Super Admin only. You don't have permission to view user management.
          </p>
          <a
            href="/dashboard"
            className="mt-6 px-6 py-3 bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] text-white rounded-[10px] no-underline text-[14px] font-medium"
          >
            Back to Dashboard
          </a>
        </div>
      </Layout>
    );
  }

  const users = getAllUsers();
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Users size={24} color="#fff" />
              </div>
              <div>
                <h1 className="text-[28px] font-bold">User Management</h1>
                <p className="text-[14px] text-[#666]">
                  Manage all HeyClaw users and their permissions
                </p>
              </div>
            </div>
          </div>

          {/* Super Admin Badge */}
          <div className="flex items-center gap-3 px-5 py-4 bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] rounded-xl mb-8">
            <Crown size={24} className="text-[#6366f1]" />
            <div>
              <p className="text-[14px] font-semibold text-[#6366f1]">
                Super Admin Access
              </p>
              <p className="text-[13px] text-[#888]">
                You have full access to manage all users and system settings
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total Users"
              value={users.length + 1}
              icon={Users}
              color="#6366f1"
            />
            <StatCard
              label="Super Admins"
              value={1}
              icon={Crown}
              color="#f59e0b"
            />
            <StatCard
              label="Admins"
              value={users.filter(u => u.role === 'admin').length}
              icon={Shield}
              color="#10b981"
            />
            <StatCard
              label="Regular Users"
              value={users.filter(u => u.role === 'user').length}
              icon={UserIcon}
              color="#6b7280"
            />
          </div>

          {/* Search & Filter */}
          <div className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666]" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[10px] text-white text-[14px]"
              />
            </div>
            <button className="flex items-center gap-2 px-5 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[10px] text-white text-[14px] cursor-pointer">
              <Filter size={18} />
              Filter
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_0.5fr] gap-4 px-5 py-4 bg-[rgba(255,255,255,0.02)] border-b border-[var(--border-color)] text-[13px] font-semibold text-[#888] uppercase tracking-[0.5px]">
              <span>User</span>
              <span>Email</span>
              <span>Role</span>
              <span>Login Method</span>
              <span></span>
            </div>

            {/* Current Super Admin */}
            <UserRow user={user} isCurrentUser />

            {/* Other Users */}
            {filteredUsers.map((u) => (
              <UserRow key={u.id} user={u} />
            ))}

            {filteredUsers.length === 0 && (
              <div className="p-12 text-center text-[#666]">
                <p>No users found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: number;
  icon: any;
  color: string;
}) {
  return (
    <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        <span className="text-[24px] font-bold">{value}</span>
      </div>
      <span className="text-[13px] text-[#666]">{label}</span>
    </div>
  );
}

function UserRow({ user, isCurrentUser = false }: { user: any; isCurrentUser?: boolean }) {
  const getRoleBadge = (role: string) => {
    const styles: Record<string, any> = {
      super_admin: { bg: 'rgba(99, 102, 241, 0.2)', color: '#6366f1', label: 'Super Admin' },
      admin: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', label: 'Admin' },
      user: { bg: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af', label: 'User' },
    };
    const style = styles[role] || styles.user;

    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[100px] text-[12px] font-medium"
        style={{ background: style.bg, color: style.color }}
      >
        {role === 'super_admin' && <Crown size={12} />}
        {role === 'admin' && <Shield size={12} />}
        {role === 'user' && <UserIcon size={12} />}
        {style.label}
      </span>
    );
  };

  return (
    <div
      className={`grid grid-cols-[2fr_1.5fr_1fr_1fr_0.5fr] gap-4 px-5 py-4 border-b border-[var(--border-color)] items-center ${isCurrentUser ? 'bg-[rgba(99,102,241,0.05)]' : 'bg-transparent'}`}
    >
      {/* User Info */}
      <div className="flex items-center gap-3">
        <img
          src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
          alt={user.name}
          className="w-10 h-10 rounded-[10px] object-cover"
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{user.name}</span>
            {isCurrentUser && (
              <span className="text-[11px] px-2 py-0.5 bg-[rgba(99,102,241,0.2)] text-[#6366f1] rounded-[100px]">
                You
              </span>
            )}
          </div>
          <span className="text-[13px] text-[#666]">ID: {user.id.slice(0, 8)}...</span>
        </div>
      </div>

      {/* Email */}
      <div className="flex items-center gap-2 text-[#888]">
        <Mail size={14} />
        <span className="text-[14px]">{user.email}</span>
      </div>

      {/* Role */}
      <div>
        {getRoleBadge(user.role)}
      </div>

      {/* Login Method */}
      <div className="flex items-center gap-2">
        <span
          className={`text-[13px] px-2.5 py-1 rounded-md capitalize ${user.loginMethod === 'google' ? 'bg-[rgba(234,67,53,0.1)] text-[#ea4335]' : 'bg-[rgba(99,102,241,0.1)] text-[#6366f1]'}`}
        >
          {user.loginMethod}
        </span>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        {!isCurrentUser && (
          <button className="bg-transparent border-none text-[#666] cursor-pointer p-2 rounded-md hover:bg-white/5">
            <MoreVertical size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';

export default UsersPage;
