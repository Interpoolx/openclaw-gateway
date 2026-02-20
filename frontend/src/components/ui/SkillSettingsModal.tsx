import React from 'react';
import { Modal } from './Modal';
import { Shield, Calendar, User, Code2 } from 'lucide-react';
import { InstalledSkill } from '../../lib/api';

interface SkillSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    skill: InstalledSkill | null;
}

export function SkillSettingsModal({ isOpen, onClose, skill }: SkillSettingsModalProps) {
    if (!skill) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Skill Settings" width="550px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Skill Hero */}
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                    }}>
                        {skill.category === 'coding' ? '💻' :
                            skill.category === 'productivity' ? '⚡' : '📦'}
                    </div>
                    <div>
                        <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: 0 }}>{skill.name}</h3>
                        <p style={{ color: '#60a5fa', fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
                            v{skill.version} • {skill.category || 'General'}
                        </p>
                    </div>
                </div>

                {/* Info Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                    <InfoItem icon={<User size={16} />} label="Author" value={skill.author || 'Unknown'} />
                    <InfoItem icon={<Calendar size={16} />} label="Installed" value={new Date(skill.installDate).toLocaleDateString()} />
                    <InfoItem icon={<Shield size={16} />} label="Security" value={skill.securityStatus} color={skill.securityStatus === 'verified' ? '#22c55e' : '#f59e0b'} />
                    <InfoItem icon={<Code2 size={16} />} label="Status" value={skill.isEnabled ? 'Enabled' : 'Disabled'} color={skill.isEnabled ? '#22c55e' : '#6b7280'} />
                </div>

                {/* Description */}
                <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                        Description
                    </h4>
                    <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
                        {skill.description || 'No description provided for this skill.'}
                    </p>
                </div>

                {/* Settings Stub */}
                <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                        Configuration
                    </h4>
                    <div style={{
                        padding: '16px',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        textAlign: 'center'
                    }}>
                        <p style={{ color: '#4b5563', fontSize: '13px' }}>
                            Advanced configurations for this skill will be available in v2.5
                        </p>
                    </div>
                </div>

                {/* Action Button */}
                <div style={{ marginTop: '8px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%',
                            padding: '14px',
                            backgroundColor: '#3b82f6',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                        onMouseOut={(e) => e.currentTarget.style.filter = 'unset'}
                    >
                        Done
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function InfoItem({ icon, label, value, color = '#ccc' }: { icon: React.ReactNode; label: string; value: string; color?: string }) {
    return (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ color: '#4b5563' }}>{icon}</div>
            <div>
                <div style={{ fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{label}</div>
                <div style={{ fontSize: '14px', color: color, fontWeight: 500, textTransform: label === 'Security' ? 'capitalize' : 'none' }}>{value}</div>
            </div>
        </div>
    );
}
