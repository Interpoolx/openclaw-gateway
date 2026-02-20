import { useEffect, useMemo, useRef, useState } from 'react';
import { BUILDER_DRAFT_STORAGE_KEY, DEFAULT_BUILDER_STATE } from './constants';
import { BuilderDraftPayload, BuilderState } from './types';
import { validateStep } from './validation';

interface UseBuilderStateResult {
  state: BuilderState;
  setState: (partial: Partial<BuilderState>) => void;
  canAdvance: boolean;
  advance: () => void;
  back: () => void;
  reset: () => void;
  discardDraft: () => void;
  resumeDraft: () => void;
  hasDraft: boolean;
  draftTimestamp: string | null;
}

export function useBuilderState(): UseBuilderStateResult {
  const [state, setInternalState] = useState<BuilderState>(DEFAULT_BUILDER_STATE);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const pendingDraftRef = useRef<BuilderState | null>(null);
  const shouldPersistRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const rawDraft = localStorage.getItem(BUILDER_DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      shouldPersistRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(rawDraft) as BuilderDraftPayload;
      if (parsed?.state && parsed?.timestamp) {
        pendingDraftRef.current = parsed.state;
        setHasDraft(true);
        setDraftTimestamp(parsed.timestamp);
        return;
      }
    } catch {
      localStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY);
    }

    shouldPersistRef.current = true;
  }, []);

  useEffect(() => {
    if (!shouldPersistRef.current) return;

    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      const draftPayload: BuilderDraftPayload = {
        state,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(BUILDER_DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
      setDraftTimestamp(draftPayload.timestamp);
    }, 500);

    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state]);

  const setState = (partial: Partial<BuilderState>) => {
    setInternalState((prev) => ({
      ...prev,
      ...partial,
    }));
  };

  const canAdvance = useMemo(() => validateStep(state, state.step), [state]);

  const advance = () => {
    if (!validateStep(state, state.step)) return;
    setInternalState((prev) => ({
      ...prev,
      step: prev.step < 4 ? ((prev.step + 1) as BuilderState['step']) : prev.step,
    }));
  };

  const back = () => {
    setInternalState((prev) => ({
      ...prev,
      step: prev.step > 1 ? ((prev.step - 1) as BuilderState['step']) : prev.step,
    }));
  };

  const reset = () => {
    setInternalState(DEFAULT_BUILDER_STATE);
  };

  const discardDraft = () => {
    localStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY);
    pendingDraftRef.current = null;
    setHasDraft(false);
    setDraftTimestamp(null);
    shouldPersistRef.current = true;
    setInternalState(DEFAULT_BUILDER_STATE);
  };

  const resumeDraft = () => {
    if (pendingDraftRef.current) {
      setInternalState(pendingDraftRef.current);
    }
    pendingDraftRef.current = null;
    setHasDraft(false);
    shouldPersistRef.current = true;
  };

  return {
    state,
    setState,
    canAdvance,
    advance,
    back,
    reset,
    discardDraft,
    resumeDraft,
    hasDraft,
    draftTimestamp,
  };
}

