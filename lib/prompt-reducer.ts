import type {
  OutputStyle,
  PromptConfig,
  PromptSectionKey,
  PromptVariable,
  ReasoningConfig,
  SafetyConfig,
} from "@/types/prompt";
import { cloneConfig, DEFAULT_PRESET_ID, getDefaultConfig } from "@/lib/presets";
import { createId } from "@/lib/id";
import { uniqueVariableName } from "@/lib/variable-parser";
import { clampText as clamp, MAX_VARIABLES } from "@/lib/config-utils";

export type PromptAction =
  | { type: "setSection"; key: PromptSectionKey; value: string }
  | { type: "setStyle"; style: OutputStyle }
  | { type: "setReasoning"; patch: Partial<ReasoningConfig> }
  | { type: "setSafety"; patch: Partial<SafetyConfig> }
  | { type: "addVariable"; variable?: Partial<Omit<PromptVariable, "id">> }
  | { type: "addVariables"; names: string[] }
  | { type: "updateVariable"; id: string; patch: Partial<Omit<PromptVariable, "id">> }
  | { type: "removeVariable"; id: string }
  | { type: "load"; config: PromptConfig }
  | { type: "reset" };

export function promptReducer(state: PromptConfig, action: PromptAction): PromptConfig {
  switch (action.type) {
    case "setSection":
      if (state.sections[action.key] === action.value) return state;
      return { ...state, sections: { ...state.sections, [action.key]: clamp(action.value) } };

    case "setStyle":
      return state.formatting.style === action.style ? state : { ...state, formatting: { style: action.style } };

    case "setReasoning":
      return { ...state, reasoning: { ...state.reasoning, ...action.patch } };

    case "setSafety": {
      const patch = { ...action.patch };
      if (typeof patch.refusalDirective === "string") patch.refusalDirective = clamp(patch.refusalDirective);
      return { ...state, safety: { ...state.safety, ...patch } };
    }

    case "addVariable": {
      if (state.variables.length >= MAX_VARIABLES) return state;
      const existing = state.variables.map((v) => v.name);
      const requested = action.variable?.name?.trim() || "variable";
      const variable: PromptVariable = {
        id: createId("var"),
        name: uniqueVariableName(requested, existing),
        description: action.variable?.description ?? "",
        sampleValue: action.variable?.sampleValue ?? "",
      };
      return { ...state, variables: [...state.variables, variable] };
    }

    case "addVariables": {
      const existing = new Set(state.variables.map((v) => v.name.trim()));
      const additions: PromptVariable[] = [];
      for (const name of action.names) {
        if (existing.has(name) || state.variables.length + additions.length >= MAX_VARIABLES) continue;
        existing.add(name);
        additions.push({ id: createId("var"), name, description: "", sampleValue: "" });
      }
      return additions.length ? { ...state, variables: [...state.variables, ...additions] } : state;
    }

    case "updateVariable":
      return {
        ...state,
        variables: state.variables.map((v) =>
          v.id === action.id
            ? {
                ...v,
                ...action.patch,
                ...(action.patch.description !== undefined && { description: clamp(action.patch.description) }),
                ...(action.patch.sampleValue !== undefined && { sampleValue: clamp(action.patch.sampleValue) }),
              }
            : v,
        ),
      };

    case "removeVariable":
      return { ...state, variables: state.variables.filter((v) => v.id !== action.id) };

    case "load":
      return cloneConfig(action.config);

    case "reset":
      return getDefaultConfig();

    default:
      return state;
  }
}

/** Workspace state: the config plus which starter preset (if any) it originated from. */
export interface WorkspaceState {
  config: PromptConfig;
  presetId: string | null;
}

export type WorkspaceAction =
  | PromptAction
  | { type: "loadPreset"; presetId: string; config: PromptConfig }
  | { type: "restore"; config: PromptConfig };

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "loadPreset":
      return { config: cloneConfig(action.config), presetId: action.presetId };
    case "restore":
      return { config: cloneConfig(action.config), presetId: null };
    case "reset":
      return { config: getDefaultConfig(), presetId: DEFAULT_PRESET_ID };
    default: {
      const config = promptReducer(state.config, action);
      return config === state.config ? state : { ...state, config };
    }
  }
}

export function initWorkspaceState(): WorkspaceState {
  return { config: getDefaultConfig(), presetId: DEFAULT_PRESET_ID };
}
