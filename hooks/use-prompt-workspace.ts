"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { OutputStyle } from "@/types/prompt";
import {
  initWorkspaceState,
  workspaceReducer,
  type PromptAction,
  type WorkspaceState,
} from "@/lib/prompt-reducer";
import { generatePrompt, getTemplateTexts, resolvePrompt } from "@/lib/prompt-generator";
import { validatePrompt } from "@/lib/prompt-validator";
import { extractVariableNames } from "@/lib/variable-parser";
import { getDefaultConfig, getPresetById } from "@/lib/presets";
import { configsEqual } from "@/lib/config-utils";
import {
  getPersistenceState,
  getServerPersistenceState,
  loadDraft,
  saveDraft,
  setPersistenceEnabled,
  subscribePersistence,
  type SaveDraftResult,
} from "@/lib/draft-storage";

export interface UndoState {
  id: number;
  message: string;
  previous: WorkspaceState;
}

export function usePromptWorkspace() {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, initWorkspaceState);
  const { config, presetId: selectedPresetId } = state;
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const undoCounter = useRef(0);

  // --- Derived output -------------------------------------------------------------------
  // Generation, validation and highlighting are derived from a deferred copy of the config so
  // typing in the builder stays responsive even with very large prompts.
  const derivedConfig = useDeferredValue(config);
  const output = useMemo(() => generatePrompt(derivedConfig), [derivedConfig]);
  const validation = useMemo(() => validatePrompt(derivedConfig, output), [derivedConfig, output]);
  const style = config.formatting.style;
  const activeText = output[style];
  const isDefault = useMemo(() => configsEqual(derivedConfig, getDefaultConfig()), [derivedConfig]);
  const selectedPreset = selectedPresetId ? getPresetById(selectedPresetId) : undefined;
  const presetModified = useMemo(
    () => (selectedPreset ? !configsEqual(derivedConfig, selectedPreset.config) : false),
    [derivedConfig, selectedPreset],
  );

  // --- Draft persistence (opt-in, localStorage only) ------------------------------------
  const persistence = useSyncExternalStore(subscribePersistence, getPersistenceState, getServerPersistenceState);
  const persistDrafts = persistence === "on";
  const storageAvailable = persistence !== "unavailable";
  const [saveStatus, setSaveStatus] = useState<SaveDraftResult | null>(null);
  const restoredRef = useRef(false);

  useEffect(() => {
    // Restore a saved draft once, after hydration (localStorage is not available on the server).
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (getPersistenceState() !== "on") return;
    const draft = loadDraft();
    if (draft) dispatch({ type: "restore", config: draft });
  }, []);

  useEffect(() => {
    if (!persistDrafts || !restoredRef.current) return;
    const handle = window.setTimeout(() => setSaveStatus(saveDraft(config)), 400);
    return () => window.clearTimeout(handle);
  }, [config, persistDrafts]);

  const togglePersistDrafts = useCallback(
    (enabled: boolean) => {
      const ok = setPersistenceEnabled(enabled);
      setSaveStatus(ok && enabled ? saveDraft(config) : null);
    },
    [config],
  );

  // --- Actions --------------------------------------------------------------------------
  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = getPresetById(presetId);
      if (!preset) return;
      undoCounter.current += 1;
      setUndoState({ id: undoCounter.current, message: `Loaded preset "${preset.name}".`, previous: state });
      dispatch({ type: "loadPreset", presetId: preset.id, config: preset.config });
    },
    [state],
  );

  const resetToDefault = useCallback(() => {
    undoCounter.current += 1;
    setUndoState({ id: undoCounter.current, message: "Workspace reset to the default example.", previous: state });
    dispatch({ type: "reset" });
  }, [state]);

  const undo = useCallback(() => {
    if (!undoState) return;
    const { previous } = undoState;
    if (previous.presetId) dispatch({ type: "loadPreset", presetId: previous.presetId, config: previous.config });
    else dispatch({ type: "restore", config: previous.config });
    setUndoState(null);
  }, [undoState]);

  const dismissUndo = useCallback(() => setUndoState(null), []);

  // Any edit after a preset load or reset invalidates the pending undo, which would otherwise
  // silently discard that edit.
  const send = useCallback((action: PromptAction) => {
    setUndoState(null);
    dispatch(action);
  }, []);

  const setStyle = useCallback((next: OutputStyle) => send({ type: "setStyle", style: next }), [send]);

  // --- Variable simulator ---------------------------------------------------------------
  const [simValues, setSimValues] = useState<Record<string, string>>({});
  const [useSampleFallback, setUseSampleFallback] = useState(true);

  const detectedVariables = useMemo(() => extractVariableNames(...getTemplateTexts(config)), [config]);

  const resolutionValues = useMemo(() => {
    const values: Record<string, string> = {};
    for (const name of detectedVariables) {
      const typed = simValues[name];
      if (typed) {
        values[name] = typed;
        continue;
      }
      if (useSampleFallback) {
        const def = config.variables.find((v) => v.name.trim() === name);
        if (def?.sampleValue) values[name] = def.sampleValue;
      }
    }
    return values;
  }, [config.variables, detectedVariables, simValues, useSampleFallback]);

  const resolvedText = useMemo(
    () => resolvePrompt(derivedConfig, resolutionValues, style),
    [derivedConfig, resolutionValues, style],
  );

  const setSimValue = useCallback((name: string, value: string) => {
    setSimValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const fillSimWithSamples = useCallback(() => {
    setSimValues((prev) => {
      const next = { ...prev };
      for (const name of detectedVariables) {
        const def = config.variables.find((v) => v.name.trim() === name);
        if (def?.sampleValue) next[name] = def.sampleValue;
      }
      return next;
    });
  }, [config.variables, detectedVariables]);

  const clearSimValues = useCallback(() => setSimValues({}), []);

  return {
    config,
    dispatch: send,
    output,
    validation,
    style,
    activeText,
    setStyle,
    isDefault,
    selectedPresetId,
    presetModified,
    applyPreset,
    resetToDefault,
    undoState,
    undo,
    dismissUndo,
    persistDrafts,
    storageAvailable,
    saveStatus,
    togglePersistDrafts,
    detectedVariables,
    simValues,
    setSimValue,
    useSampleFallback,
    setUseSampleFallback,
    fillSimWithSamples,
    clearSimValues,
    resolutionValues,
    resolvedText,
  };
}

export type PromptWorkspace = ReturnType<typeof usePromptWorkspace>;
