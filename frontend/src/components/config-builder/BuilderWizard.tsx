import { useEffect } from 'react';
import { ArrowRight, Check, Circle, Target, Settings, Sliders, FileCheck } from 'lucide-react';
import { BuilderState, BuilderStep } from './types';
import { WizardStep1Goal } from './WizardStep1Goal';
import { WizardStep2Model } from './WizardStep2Model';
import { WizardStep3Options } from './WizardStep3Options';
import { WizardStep4Review } from './WizardStep4Review';
import { getStepValidationErrors } from './validation';

interface BuilderWizardProps {
  state: BuilderState;
  setState: (partial: Partial<BuilderState>) => void;
  canAdvance: boolean;
  advance: () => void;
  back: () => void;
  onProviderSwitchToOllama?: () => void;
  status: 'INVALID' | 'VALID' | 'READY';
  readyWarnings: string[];
  warningCount: number;
  errorCount: number;
  onSave?: () => void;
  canSave?: boolean;
}

const STEP_LABELS: Array<{ step: BuilderStep; label: string; icon: React.ReactNode }> = [
  { step: 1, label: 'Goal & Channels', icon: <Target size={14} /> },
  { step: 2, label: 'Provider & Model', icon: <Settings size={14} /> },
  { step: 3, label: 'Advanced Options', icon: <Sliders size={14} /> },
  { step: 4, label: 'Review & Export', icon: <FileCheck size={14} /> },
];

export function BuilderWizard({
  state,
  setState,
  canAdvance,
  advance,
  back,
  onProviderSwitchToOllama,
  status,
  readyWarnings,
  warningCount,
  errorCount,
  onSave,
  canSave,
}: BuilderWizardProps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      if (state.step >= 4) return;

      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON')) return;
      if (!canAdvance) return;

      event.preventDefault();
      advance();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.step, canAdvance, advance]);

  const stepErrors = getStepValidationErrors(state, state.step);

  return (
    <section
      aria-label="Config Builder Wizard"
      style={{
        border: '1px solid rgba(148, 163, 184, 0.25)',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.4) 100%)',
        padding: '20px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div role="tablist" aria-label="Wizard steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px', marginBottom: '16px' }}>
        {STEP_LABELS.map((stepDef) => (
          <button
            key={stepDef.step}
            role="tab"
            aria-label={`Step ${stepDef.step}: ${stepDef.label}`}
            aria-current={state.step === stepDef.step ? 'step' : undefined}
            onClick={() => setState({ step: stepDef.step })}
            style={{
              border: state.step === stepDef.step 
                ? '1px solid rgba(56, 189, 248, 0.6)' 
                : state.step > stepDef.step 
                  ? '1px solid rgba(34, 197, 94, 0.5)' 
                  : '1px solid rgba(148, 163, 184, 0.15)',
              background: state.step === stepDef.step 
                ? 'linear-gradient(135deg, rgba(8, 145, 178, 0.4) 0%, rgba(6, 95, 136, 0.3) 100%)' 
                : state.step > stepDef.step 
                  ? 'rgba(22, 163, 74, 0.2)' 
                  : 'rgba(2, 6, 23, 0.5)',
              color: state.step === stepDef.step ? '#bae6fd' : state.step > stepDef.step ? '#86efac' : '#94a3b8',
              borderRadius: '10px',
              padding: '10px 8px',
              fontSize: '11px',
              textAlign: 'center',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: state.step === stepDef.step ? '0 2px 8px rgba(56, 189, 248, 0.2)' : 'none',
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              justifyContent: 'center'
            }}>
              {state.step > stepDef.step ? (
                <Check size={12} style={{ color: '#86efac' }} />
              ) : (
                <Circle size={12} fill={state.step === stepDef.step ? '#bae6fd' : 'transparent'} stroke={state.step === stepDef.step ? '#bae6fd' : '#64748b'} />
              )}
              <span>{stepDef.label}</span>
            </div>
          </button>
        ))}
      </div>

      {state.step === 1 && <WizardStep1Goal state={state} setState={setState} />}
      {state.step === 2 && (
        <WizardStep2Model
          state={state}
          setState={setState}
          onProviderSwitchToOllama={onProviderSwitchToOllama}
        />
      )}
      {state.step === 3 && (
        <WizardStep3Options state={state} setState={setState} readyWarnings={readyWarnings} />
      )}
      {state.step === 4 && (
        <WizardStep4Review
          status={status}
          warningCount={warningCount}
          errorCount={errorCount}
          onSave={onSave}
          canSave={canSave}
        />
      )}

      {stepErrors.length > 0 && (
        <div
          style={{
            marginTop: '10px',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'rgba(127, 29, 29, 0.3)',
            borderRadius: '8px',
            color: '#fecaca',
            fontSize: '12px',
            padding: '8px',
          }}
        >
          {stepErrors.map((error) => (
            <div key={error}>{error}</div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
        <button
          type="button"
          onClick={back}
          disabled={state.step <= 1}
          style={{
            border: '1px solid rgba(148, 163, 184, 0.25)',
            background: state.step <= 1 
              ? 'rgba(30, 41, 59, 0.5)' 
              : 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.6) 100%)',
            color: state.step <= 1 ? '#475569' : '#e2e8f0',
            borderRadius: '10px',
            padding: '10px 18px',
            cursor: state.step <= 1 ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={advance}
          disabled={!canAdvance || state.step >= 4}
          style={{
            border: '1px solid rgba(56, 189, 248, 0.45)',
            background: canAdvance && state.step < 4 
              ? 'linear-gradient(135deg, rgba(8, 145, 178, 0.5) 0%, rgba(6, 95, 136, 0.4) 100%)' 
              : 'rgba(51, 65, 85, 0.6)',
            color: canAdvance && state.step < 4 ? '#bae6fd' : '#94a3b8',
            borderRadius: '10px',
            padding: '10px 18px',
            cursor: canAdvance && state.step < 4 ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
            boxShadow: canAdvance && state.step < 4 ? '0 2px 8px rgba(56, 189, 248, 0.2)' : 'none',
          }}
        >
          {state.step >= 4 ? 'Complete' : 'Continue'} <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}

