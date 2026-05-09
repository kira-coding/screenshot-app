import { create } from "zustand";
import { Store } from '@tauri-apps/plugin-store';
import { isEnabled } from '@tauri-apps/plugin-autostart';

export type ToolType =
  | "select" | "move" | "rect" | "circle" | "triangle" | "hexagon"
  | "line" | "arrow" | "pencil" | "highlighter" | "text" | "eraser" | "crop";

export type CaptureMode = "region" | "window" | "fullscreen" | "scrolling";
export type AppMode = "screenshot" | "whiteboard";
export type BorderStyle = "solid" | "dashed" | "dotted";

export interface AppState {
  /* Capture Overlay State */
  isCaptureOverlay: boolean;
  setIsCaptureOverlay: (v: boolean) => void;
  isRecordOverlay: boolean;
  setIsRecordOverlay: (v: boolean) => void;

  /* Mode */
  appMode: AppMode;
  setAppMode: (m: AppMode) => void;

  /* Active tool */
  activeTool: ToolType;
  setActiveTool: (t: ToolType) => void;

  /* Capture */
  captureMode: CaptureMode;
  setCaptureMode: (m: CaptureMode) => void;

  /* Selection properties */
  fillColor: string;
  setFillColor: (c: string) => void;
  strokeColor: string;
  setStrokeColor: (c: string) => void;
  opacity: number;
  setOpacity: (v: number) => void;
  strokeWidth: number;
  setStrokeWidth: (v: number) => void;
  borderRadius: number;
  setBorderRadius: (v: number) => void;
  borderStyle: BorderStyle;
  setBorderStyle: (s: BorderStyle) => void;
  fontSize: number;
  setFontSize: (v: number) => void;

  /* File state */
  filePath: string | null;
  setFilePath: (p: string | null) => void;
  fileName: string;
  setFileName: (n: string) => void;
  isDirty: boolean;
  setIsDirty: (v: boolean) => void;

  /* Zoom */
  zoom: number;
  setZoom: (z: number) => void;

  /* History counts (fabric manages actual history) */
  canUndo: boolean;
  setCanUndo: (v: boolean) => void;
  canRedo: boolean;
  setCanRedo: (v: boolean) => void;

  /* Toast */
  toast: { msg: string; type: "success" | "error" | "info" } | null;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  clearToast: () => void;

  /* Grid */
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;

  /* Loading */
  loading: boolean;
  setLoading: (v: boolean) => void;

  /* Global Shortcut */
  globalShortcut: string;
  setGlobalShortcut: (s: string) => void;
  recordShortcut: string;
  setRecordShortcut: (s: string) => void;

  /* Active menu */
  activeMenu: string | null;
  setActiveMenu: (m: string | null) => void;

  /* Settings */
  autoStart: boolean;
  setAutoStart: (v: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (v: boolean) => void;
  loadSettings: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  isCaptureOverlay: false,
  setIsCaptureOverlay: (v) => set({ isCaptureOverlay: v }),
  isRecordOverlay: false,
  setIsRecordOverlay: (v) => set({ isRecordOverlay: v }),

  appMode: "screenshot",
  setAppMode: (m) => set({ appMode: m, filePath: null, fileName: "Untitled", isDirty: false }),

  activeTool: "select",
  setActiveTool: (t) => set({ activeTool: t }),

  captureMode: "region",
  setCaptureMode: (m) => set({ captureMode: m }),

  fillColor: "#EF4444",
  setFillColor: (c) => set({ fillColor: c }),
  strokeColor: "#EF4444",
  setStrokeColor: (c) => set({ strokeColor: c }),
  opacity: 100,
  setOpacity: (v) => set({ opacity: v }),
  strokeWidth: 2,
  setStrokeWidth: (v) => set({ strokeWidth: v }),
  borderRadius: 0,
  setBorderRadius: (v) => set({ borderRadius: v }),
  borderStyle: "solid",
  setBorderStyle: (s) => set({ borderStyle: s }),
  fontSize: 16,
  setFontSize: (v) => set({ fontSize: v }),

  filePath: null,
  setFilePath: (p) => set({ filePath: p }),
  fileName: "Untitled",
  setFileName: (n) => set({ fileName: n }),
  isDirty: false,
  setIsDirty: (v) => set({ isDirty: v }),

  zoom: 100,
  setZoom: (z) => set({ zoom: z }),

  canUndo: false,
  setCanUndo: (v) => set({ canUndo: v }),
  canRedo: false,
  setCanRedo: (v) => set({ canRedo: v }),

  toast: null,
  showToast: (msg, type = "success") => {
    set({ toast: { msg, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },
  clearToast: () => set({ toast: null }),

  showGrid: true,
  setShowGrid: (v) => set({ showGrid: v }),

  loading: false,
  setLoading: (v) => set({ loading: v }),

  globalShortcut: "CommandOrControl+Shift+4",
  setGlobalShortcut: (s) => set({ globalShortcut: s }),
  recordShortcut: "CommandOrControl+Shift+R",
  setRecordShortcut: (s) => set({ recordShortcut: s }),

  activeMenu: null,
  setActiveMenu: (m) => set({ activeMenu: m }),

  autoStart: false,
  setAutoStart: (v) => set({ autoStart: v }),
  isSettingsOpen: false,
  setIsSettingsOpen: (v) => set({ isSettingsOpen: v }),
  loadSettings: async () => {
    try {
      const store = await Store.load('settings.json');
      const savedShortcut = await store.get<{value: string}>('globalShortcut');
      if (savedShortcut && savedShortcut.value) {
        set({ globalShortcut: savedShortcut.value });
      }
      const savedRecordShortcut = await store.get<{value: string}>('recordShortcut');
      if (savedRecordShortcut && savedRecordShortcut.value) {
        set({ recordShortcut: savedRecordShortcut.value });
      }
      
      const autoStartEnabled = await isEnabled();
      set({ autoStart: autoStartEnabled });
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  },
}));
