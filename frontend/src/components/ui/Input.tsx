import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, style, id, ...props }, ref) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2)}`;

    return (
      <div style={{ marginBottom: '16px' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#9ca3af',
              marginBottom: '8px',
            }}
          >
            {label}
          </label>
        )}
        <div style={{ position: 'relative' }}>
          {leftIcon && (
            <span
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            style={{
              width: '100%',
              padding: leftIcon ? '10px 14px 10px 44px' : '10px 14px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${error ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '8px',
              color: '#f3f4f6',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxShadow: error ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none',
              ...style,
            }}
            {...props}
          />
        </div>
        {error && (
          <span
            style={{
              color: '#ef4444',
              fontSize: '12px',
              marginTop: '6px',
              display: 'block',
            }}
          >
            {error}
          </span>
        )}
        {helperText && !error && (
          <span
            style={{
              color: '#6b7280',
              fontSize: '12px',
              marginTop: '6px',
              display: 'block',
            }}
          >
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helperText, id, style, ...props }, ref) => {
    const textareaId = id ?? `textarea-${Math.random().toString(36).slice(2)}`;

    return (
      <div style={{ marginBottom: '16px' }}>
        {label && (
          <label
            htmlFor={textareaId}
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#9ca3af',
              marginBottom: '8px',
            }}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${error ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '8px',
            color: '#f3f4f6',
            fontSize: '14px',
            outline: 'none',
            resize: 'vertical',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: error ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : 'none',
            ...style,
          }}
          {...props}
        />
        {error && (
          <span
            style={{
              color: '#ef4444',
              fontSize: '12px',
              marginTop: '6px',
              display: 'block',
            }}
          >
            {error}
          </span>
        )}
        {helperText && !error && (
          <span
            style={{
              color: '#6b7280',
              fontSize: '12px',
              marginTop: '6px',
              display: 'block',
            }}
          >
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, id, style, ...props }, ref) => {
    const selectId = id ?? `select-${Math.random().toString(36).slice(2)}`;

    return (
      <div style={{ marginBottom: '16px' }}>
        {label && (
          <label
            htmlFor={selectId}
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#9ca3af',
              marginBottom: '8px',
            }}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${error ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '8px',
            color: '#f3f4f6',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            ...style,
          }}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <span
            style={{
              color: '#ef4444',
              fontSize: '12px',
              marginTop: '6px',
              display: 'block',
            }}
          >
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
