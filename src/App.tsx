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
        await win.unminimize();
        await win.setFocus();
      });
      unlisteners.push(u1);

      const u2 = await listen("open_whiteboard", async () => {
        setAppMode("whiteboard");
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
          await win.unminimize();
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

  return (
    <div className={`app-shell ${isAnyOverlay ? "overlay-mode" : ""}`}>
      {isCaptureOverlay && <CapturePill onCapture={handleCapture} />}
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
