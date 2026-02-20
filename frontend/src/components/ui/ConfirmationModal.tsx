import { Modal } from './Modal';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDestructive = true,
    isLoading = false,
}: ConfirmationModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} width="400px">
            <div style={{ textAlign: 'center' }}>
                <div
                    style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: isDestructive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px',
                    }}
                >
                    <AlertTriangle size={32} color={isDestructive ? '#ef4444' : '#3b82f6'} />
                </div>

                <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
                    {message}
                </p>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: isDestructive ? '#ef4444' : '#3b82f6',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                        }}
                        onMouseOver={(e) => {
                            if (!isLoading) e.currentTarget.style.filter = 'brightness(1.1)';
                        }}
                        onMouseOut={(e) => {
                            if (!isLoading) e.currentTarget.style.filter = 'unset';
                        }}
                    >
                        {isLoading && <Loader2 size={16} className="animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
