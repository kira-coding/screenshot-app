import { useRef, useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import * as fabric from "fabric";
import TitleBar from "./components/TitleBar";
import MainToolbar from "./components/MainToolbar";
import FloatingContextMenu from "./components/FloatingContextMenu";
import CanvasArea from "./components/CanvasArea";
import StatusBar from "./components/StatusBar";
import Toast from "./components/Toast";
import CapturePill from "./components/CapturePill";
import RecordPill from "./components/RecordPill";
import SettingsModal from "./components/SettingsModal";
import { useAppStore } from "./store/appStore";
import type { Canvas as FabricCanvas } from "fabric";

export default function App() {
  const canvasRef = useRef<FabricCanvas | null>(null);
  const [panelVisible, setPanelVisible] = useState(true);
  const appMode = useAppStore((s) => s.appMode);
  const setAppMode = useAppStore((s) => s.setAppMode);
  const showToast = useAppStore((s) => s.showToast);
  const isCaptureOverlay = useAppStore((s) => s.isCaptureOverlay);
  const setIsCaptureOverlay = useAppStore((s) => s.setIsCaptureOverlay);
  const isRecordOverlay = useAppStore((s) => s.isRecordOverlay);
  const setIsRecordOverlay = useAppStore((s) => s.setIsRecordOverlay);
  const globalShortcut = useAppStore((s) => s.globalShortcut);
  const recordShortcut = useAppStore((s) => s.recordShortcut);
  const loadSettings = useAppStore((s) => s.loadSettings);

  const [selection, setSelection] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const selectionStart = useRef({ x: 0, y: 0 });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const setCanvas = useCallback((c: FabricCanvas) => {
    canvasRef.current = c;
  }, []);

  const handleCapture = useCallback((b64: string) => {
    if (canvasRef.current && b64) {
      const imgEl = new Image();
      imgEl.onload = () => {
        const fImg = new fabric.FabricImage(imgEl, {
          left: 0,
          top: 0,
          selectable: true,
        });
        canvasRef.current?.clear();
        canvasRef.current?.add(fImg);
        canvasRef.current?.requestRenderAll();
      };
      imgEl.src = b64;
    }
    showToast("Screenshot captured and ready to edit!");
    
    // Bring window to front
    const win = getCurrentWindow();
    win.unminimize().then(() => win.setFocus()).catch(console.error);
  }, [showToast]);

  // Tray Events
  useEffect(() => {
    const unlisteners: (() => void)[] = [];

    const setupListeners = async () => {
      const u1 = await listen("take_screenshot", async () => {
        setIsCaptureOverlay(true);
        const win = getCurrentWindow();
        await win.show();
        await win.unminimize();
        await win.setFullscreen(true);
        await win.setFocus();
      });
      unlisteners.push(u1);

      const uCaptureRegion = await listen("capture_region", async () => {
        setIsCaptureOverlay(true);
        const win = getCurrentWindow();
        await win.show();
        await win.unminimize();
        await win.setFullscreen(true);
        await win.setFocus();
      });
      unlisteners.push(uCaptureRegion);

      const uRecordClip = await listen("record_clip", async () => {
        setIsRecordOverlay(true);
        const win = getCurrentWindow();
        await win.show();
        await win.unminimize();
        await win.setFullscreen(true);
        await win.setFocus();
      });
      unlisteners.push(uRecordClip);

      const u2 = await listen("open_whiteboard", async () => {
        setAppMode("whiteboard");
        if (canvasRef.current) {
          canvasRef.current.clear();
          canvasRef.current.backgroundColor = "#E8F0EF";
          canvasRef.current.requestRenderAll();
        }
        setIsCaptureOverlay(false);
        setIsRecordOverlay(false);
        const win = getCurrentWindow();
        await win.unminimize();
        await win.setFocus();
      });
      unlisteners.push(u2);

      const u3 = await listen("import_image", async () => {
        setAppMode("whiteboard");
        setIsCaptureOverlay(false);
        setIsRecordOverlay(false);
        const win = getCurrentWindow();
        await win.unminimize();
        await win.setFocus();
        
        try {
          const { open } = await import("@tauri-apps/plugin-dialog");
          const { readFile } = await import("@tauri-apps/plugin-fs");
          const selected = await open({
            multiple: false,
            filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
          });
          if (selected && canvasRef?.current) {
            const fileData = await readFile(selected as string);
            const blob = new Blob([fileData]);
            const url = URL.createObjectURL(blob);
            const imgEl = new Image();
            imgEl.onload = () => {
              const fImg = new fabric.FabricImage(imgEl, { left: 100, top: 100, selectable: true });
              fImg.scaleToWidth(Math.min(imgEl.width, 500));
              canvasRef.current?.add(fImg);
              canvasRef.current?.setActiveObject(fImg);
              canvasRef.current?.requestRenderAll();
              URL.revokeObjectURL(url);
            };
            imgEl.src = url;
          }
        } catch (e) {
          console.error(e);
          showToast("Failed to load image", "error");
        }
      });
      unlisteners.push(u3);
    };

    setupListeners();

    return () => {
      unlisteners.forEach(u => u());
    };
  }, [setIsCaptureOverlay, setIsRecordOverlay, setAppMode, showToast]);

  // Register Global Shortcut
  useEffect(() => {
    if (!globalShortcut) return;
    
    register(globalShortcut, async (event) => {
      if (event.state === "Pressed") {
        try {
          // Show the Capture Pill overlay
          setIsCaptureOverlay(true);
          
          // Bring window to front
          const win = getCurrentWindow();
          await win.show();
          await win.unminimize();
          await win.setFullscreen(true);
          await win.setFocus();
        } catch (e) {
          console.error("Failed to trigger capture overlay:", e);
        }
      }
    }).catch(console.error);

    return () => {
      unregister(globalShortcut).catch(console.error);
    };
  }, [globalShortcut, setIsCaptureOverlay, setIsRecordOverlay]);

  // Register Record Shortcut
  useEffect(() => {
    if (!recordShortcut) return;
    
    register(recordShortcut, async (event) => {
      if (event.state === "Pressed") {
        try {
          setIsRecordOverlay(true);
          setIsCaptureOverlay(false);
          const win = getCurrentWindow();
          await win.show();
          await win.unminimize();
          await win.setFocus();
        } catch (e) {
          console.error("Failed to trigger record overlay:", e);
        }
      }
    }).catch(console.error);

    return () => {
      unregister(recordShortcut).catch(console.error);
    };
  }, [recordShortcut, setIsRecordOverlay, setIsCaptureOverlay]);

  const isAnyOverlay = isCaptureOverlay || isRecordOverlay;

  // Handle Escape to exit overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const win = getCurrentWindow();
        win.setFullscreen(false).catch(console.error);
        if (isCaptureOverlay) setIsCaptureOverlay(false);
        if (isRecordOverlay) setIsRecordOverlay(false);
      }
    };
    if (isAnyOverlay) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAnyOverlay, isCaptureOverlay, isRecordOverlay, setIsCaptureOverlay, setIsRecordOverlay]);
  
  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (!isCaptureOverlay) return;
    setIsSelecting(true);
    selectionStart.current = { x: e.clientX, y: e.clientY };
    setSelection({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
  };

  const handleOverlayMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting) return;
    const x = Math.min(e.clientX, selectionStart.current.x);
    const y = Math.min(e.clientY, selectionStart.current.y);
    const w = Math.abs(e.clientX - selectionStart.current.x);
    const h = Math.abs(e.clientY - selectionStart.current.y);
    setSelection({ x, y, w, h });
  };

  const handleOverlayMouseUp = async () => {
    if (!isSelecting || !selection) return;
    setIsSelecting(false);
    
    if (selection.w > 5 && selection.h > 5) {
      try {
        // Capture the region
        // We hide the window first to get a clean capture of what's behind
        const win = getCurrentWindow();
        await win.hide();
        await new Promise(r => setTimeout(r, 400));
        
        const b64 = await invoke<string>("capture_region", { 
          x: Math.round(selection.x), 
          y: Math.round(selection.y), 
          width: Math.round(selection.w), 
          height: Math.round(selection.h) 
        });
        
        await win.show();
        await win.setFullscreen(false);
        await win.unmaximize();
        handleCapture(b64);
        setIsCaptureOverlay(false);
      } catch (e) {
        showToast(`Region capture failed: ${e}`, "error");
        const win = getCurrentWindow();
        await win.show();
      }
    }
    setSelection(null);
  };

  // Manage window state for overlay modes
  useEffect(() => {
    const win = getCurrentWindow();
    if (isAnyOverlay) {
      win.setAlwaysOnTop(true).catch(console.error);
      win.setFullscreen(true).catch(console.error);
    } else {
      win.setAlwaysOnTop(false).catch(console.error);
      win.setFullscreen(false).catch(console.error);
      win.unmaximize().catch(console.error);
    }
  }, [isAnyOverlay]);

  return (
    <div 
      className={`app-shell ${isAnyOverlay ? "overlay-mode" : ""}`}
      onMouseDown={handleOverlayMouseDown}
      onMouseMove={handleOverlayMouseMove}
      onMouseUp={handleOverlayMouseUp}
    >
      {isCaptureOverlay && (
        <>
          <div className="capture-dim-overlay" />
          {selection && (
            <div 
              className="region-selection-rect" 
              style={{
                left: selection.x,
                top: selection.y,
                width: selection.w,
                height: selection.h
              }}
            />
          )}
          <CapturePill onCapture={handleCapture} />
        </>
      )}
      {isRecordOverlay && <RecordPill />}
      
      {!isAnyOverlay && (
        <>
          <TitleBar canvasRef={canvasRef} />
          <div className="workspace">
            <CanvasArea onCanvasReady={setCanvas} />
            <FloatingContextMenu canvasRef={canvasRef} />
            <MainToolbar canvasRef={canvasRef} />
          </div>
          <StatusBar />
        </>
      )}
      <Toast />
      <SettingsModal />
    </div>
  );
}
