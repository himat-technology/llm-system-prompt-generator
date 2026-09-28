import type { PromptConfig } from "@/types/prompt";
import { sanitizeConfig } from "@/lib/config-utils";
import { getTemplateTexts } from "@/lib/prompt-generator";
import { detectSecrets } from "@/lib/secret-detector";

/**
 * Optional, opt-in draft persistence using `localStorage` only. Nothing is ever sent over the
 * network. Drafts that appear to contain credentials are never written.
 */
export const PERSIST_PREF_KEY = "llm-spg:persist-draft";
export const DRAFT_KEY = "llm-spg:draft:v1";

export type SaveDraftResult = "saved" | "skipped-secret" | "unavailable";

function probeStorage(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const probe = "__llm-spg-probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

let availabilityCache: boolean | undefined;

export function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  if (availabilityCache === undefined) availabilityCache = probeStorage();
  return availabilityCache;
}

/** Returns `localStorage` once it has been verified writable; probes at most once per page. */
function getStorage(): Storage | null {
  try {
    return isStorageAvailable() ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function isPersistenceEnabled(): boolean {
  try {
    return getStorage()?.getItem(PERSIST_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export type PersistenceState = "unavailable" | "on" | "off";

const listeners = new Set<() => void>();

/** Subscribe to persistence-preference changes (for `useSyncExternalStore`). */
export function subscribePersistence(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === PERSIST_PREF_KEY) listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function getPersistenceState(): PersistenceState {
  if (!isStorageAvailable()) return "unavailable";
  return isPersistenceEnabled() ? "on" : "off";
}

/** Server render / pre-hydration snapshot: persistence is treated as off. */
export function getServerPersistenceState(): PersistenceState {
  return "off";
}

/** Enables/disables draft persistence. Disabling also deletes any stored draft. */
export function setPersistenceEnabled(enabled: boolean): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    if (enabled) {
      storage.setItem(PERSIST_PREF_KEY, "1");
    } else {
      storage.removeItem(PERSIST_PREF_KEY);
      storage.removeItem(DRAFT_KEY);
    }
    return true;
  } catch {
    return false;
  } finally {
    listeners.forEach((l) => l());
  }
}

export function loadDraft(): PromptConfig | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return sanitizeConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function draftContainsSecrets(config: PromptConfig): boolean {
  return (
    detectSecrets(
      ...getTemplateTexts(config),
      config.safety.refusalDirective,
      ...config.variables.flatMap((v) => [v.sampleValue, v.description]),
    ).length > 0
  );
}

export function saveDraft(config: PromptConfig): SaveDraftResult {
  const storage = getStorage();
  if (!storage) return "unavailable";
  if (draftContainsSecrets(config)) {
    try {
      storage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    return "skipped-secret";
  }
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify(config));
    return "saved";
  } catch {
    return "unavailable";
  }
}
