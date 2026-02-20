import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { X, Shield, User, Monitor, Chrome, AlertTriangle } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

export const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'account',
  component: AccountPage,
}) as any;

interface Device {
  id: string;
  name: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

const mockDevices: Device[] = [
  {
    id: '1',
    name: 'Windows',
    browser: 'Chrome 144.0.0.0',
    ip: '2406:7400:c4:322a:693d:7263:5e6e:928',
    location: 'Chennai, IN',
    lastActive: 'Today at 6:20 PM',
    isCurrent: true,
  },
];

function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!user) {
    return null;
  }

  const handleClose = () => {
    // Navigate to redirect route which will handle workspace context
    navigate({ to: '/dashboard' });
  };

  const handleDeleteAccount = () => {
    // Handle account deletion
    logout();
    navigate({ to: '/' });
  };

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0, 0, 0, 0.8)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={handleClose}
    >
      <div 
        style={{ 
          background: '#18181C', 
          border: '1px solid #27272A', 
          borderRadius: '12px', 
          width: '100%',
          maxWidth: '800px',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #27272A'
        }}>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#A1A1AA',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#A1A1AA'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Sidebar */}
          <div style={{ 
            width: '240px', 
            background: '#18181C',
            borderRight: '1px solid #27272A',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: 700, 
              color: '#fff',
              marginBottom: '8px'
            }}>
              Account
            </h1>
            <p style={{ 
              fontSize: '13px', 
              color: '#A1A1AA',
              marginBottom: '32px'
            }}>
              Manage your account info.
            </p>

            {/* Navigation */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                onClick={() => setActiveTab('profile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: activeTab === 'profile' ? '#27272A' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: activeTab === 'profile' ? '#F59D0A' : '#A1A1AA',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                <User size={16} />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('security')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: activeTab === 'security' ? '#27272A' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: activeTab === 'security' ? '#F59D0A' : '#A1A1AA',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                <Shield size={16} />
                Security
              </button>
            </nav>

            {/* Footer */}
            <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
              <div style={{ 
                fontSize: '11px', 
                color: '#71717A',
                marginBottom: '8px'
              }}>
                Secured by Clerk
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#F59D0A',
                fontWeight: 500
              }}>
                Development mode
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div style={{ 
            flex: 1, 
            padding: '32px',
            overflowY: 'auto',
            background: '#18181C'
          }}>
            {activeTab === 'profile' && (
              <div>
                <h2 style={{ 
                  fontSize: '20px', 
                  fontWeight: 600, 
                  color: '#fff',
                  marginBottom: '24px'
                }}>
                  Profile details
                </h2>

                {/* Profile Section */}
                <div style={{ 
                  borderBottom: '1px solid #27272A',
                  paddingBottom: '24px',
                  marginBottom: '24px'
                }}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <span style={{ fontSize: '14px', color: '#A1A1AA' }}>Profile</span>
                    <button style={{
                      fontSize: '13px',
                      color: '#F59D0A',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}>
                      Update profile
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: '#27272A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 600,
                      color: '#fff'
                    }}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '16px', color: '#fff', fontWeight: 500 }}>
                      {user.name}
                    </span>
                  </div>
                </div>

                {/* Email Addresses */}
                <div style={{ 
                  borderBottom: '1px solid #27272A',
                  paddingBottom: '24px',
                  marginBottom: '24px'
                }}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <span style={{ fontSize: '14px', color: '#A1A1AA' }}>Email addresses</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '14px', color: '#fff' }}>{user.email}</span>
                    <span style={{
                      fontSize: '11px',
                      color: '#A1A1AA',
                      background: '#27272A',
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      Primary
                    </span>
                  </div>
                  <button style={{
                    fontSize: '13px',
                    color: '#F59D0A',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>+</span> Add email address
                  </button>
                </div>

                {/* Connected Accounts */}
                <div>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <span style={{ fontSize: '14px', color: '#A1A1AA' }}>Connected accounts</span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    padding: '12px',
                    background: '#27272A',
                    borderRadius: '8px'
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    </div>
                    <span style={{ fontSize: '14px', color: '#fff' }}>
                      Google • {user.email}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h2 style={{ 
                  fontSize: '20px', 
                  fontWeight: 600, 
                  color: '#fff',
                  marginBottom: '24px'
                }}>
                  Security
                </h2>

                {/* Password Section */}
                <div style={{ 
                  borderBottom: '1px solid #27272A',
                  paddingBottom: '24px',
                  marginBottom: '24px'
                }}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>Password</span>
                    <button style={{
                      fontSize: '13px',
                      color: '#F59D0A',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}>
                      Set password
                    </button>
                  </div>
                </div>

                {/* Active Devices */}
                <div style={{ 
                  borderBottom: '1px solid #27272A',
                  paddingBottom: '24px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ 
                    fontSize: '14px', 
                    color: '#fff', 
                    fontWeight: 500,
                    marginBottom: '16px'
                  }}>
                    Active devices
                  </h3>
                  {mockDevices.map((device) => (
                    <div key={device.id} style={{ display: 'flex', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        background: '#27272A',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Monitor size={20} color="#A1A1AA" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>
                            {device.name}
                          </span>
                          {device.isCurrent && (
                            <span style={{
                              fontSize: '11px',
                              color: '#A1A1AA',
                              background: '#27272A',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              This device
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', color: '#71717A', marginBottom: '2px' }}>
                          <Chrome size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          {device.browser}
                        </div>
                        <div style={{ fontSize: '13px', color: '#71717A', marginBottom: '2px' }}>
                          {device.ip}
                        </div>
                        <div style={{ fontSize: '13px', color: '#71717A', marginBottom: '2px' }}>
                          {device.location}
                        </div>
                        <div style={{ fontSize: '13px', color: '#71717A' }}>
                          {device.lastActive}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delete Account */}
                <div>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>Delete account</span>
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{
                        fontSize: '13px',
                        color: '#ef4444',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Delete account
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                  <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1100
                  }}>
                    <div style={{
                      background: '#18181C',
                      border: '1px solid #27272A',
                      borderRadius: '12px',
                      padding: '24px',
                      maxWidth: '400px',
                      width: '90%'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <AlertTriangle size={24} color="#ef4444" />
                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>
                          Delete Account?
                        </h3>
                      </div>
                      <p style={{ fontSize: '14px', color: '#A1A1AA', marginBottom: '24px' }}>
                        This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                      </p>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          style={{
                            padding: '8px 16px',
                            background: 'transparent',
                            border: '1px solid #27272A',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          style={{
                            padding: '8px 16px',
                            background: '#ef4444',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
