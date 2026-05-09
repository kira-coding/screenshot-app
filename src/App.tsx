import { useRef, useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import * as fabric from "fabric";
import TitleBar from "./components/TitleBar";
import MainToolbar from "./components/MainToolbar";
import FloatingContextMenu from "./components/FloatingContextMenu";
import CanvasArea from "./components/CanvasArea";
import StatusBar from "./components/StatusBar";
import Toast from "./components/Toast";
import CapturePill from "./components/CapturePill";
import { useAppStore } from "./store/appStore";
import type { Canvas as FabricCanvas } from "fabric";

export default function App() {
  const canvasRef = useRef<FabricCanvas | null>(null);
  const [panelVisible, setPanelVisible] = useState(true);
  const appMode = useAppStore((s) => s.appMode);
  const showToast = useAppStore((s) => s.showToast);
  const isCaptureOverlay = useAppStore((s) => s.isCaptureOverlay);
  const setIsCaptureOverlay = useAppStore((s) => s.setIsCaptureOverlay);

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

  // Register Global Shortcut
  useEffect(() => {
    const shortcut = "CommandOrControl+Shift+S";
    
    register(shortcut, async (event) => {
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
      unregister(shortcut).catch(console.error);
    };
  }, [setIsCaptureOverlay]);

  return (
    <div className={`app-shell ${isCaptureOverlay ? "overlay-mode" : ""}`}>
      {isCaptureOverlay ? (
        <CapturePill onCapture={handleCapture} />
      ) : (
        <>
          <TitleBar />
          <div className="workspace">
            <CanvasArea onCanvasReady={setCanvas} />
            <FloatingContextMenu canvasRef={canvasRef} />
            <MainToolbar />
          </div>
          <StatusBar />
        </>
      )}
      <Toast />
    </div>
  );
}
