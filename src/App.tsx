import { useRef, useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import * as fabric from "fabric";
import TitleBar from "./components/TitleBar";
import MenuBar from "./components/MenuBar";
import Toolbar from "./components/Toolbar";
import ShapePanel from "./components/ShapePanel";
import CanvasArea from "./components/CanvasArea";
import StatusBar from "./components/StatusBar";
import Toast from "./components/Toast";
import { useAppStore } from "./store/appStore";
import type { Canvas as FabricCanvas } from "fabric";

export default function App() {
  const canvasRef = useRef<FabricCanvas | null>(null);
  const [panelVisible, setPanelVisible] = useState(true);
  const appMode = useAppStore((s) => s.appMode);
  const showToast = useAppStore((s) => s.showToast);

  const setCanvas = useCallback((c: FabricCanvas) => {
    canvasRef.current = c;
  }, []);

  // Register Global Shortcut
  useEffect(() => {
    const shortcut = "CommandOrControl+Shift+S";
    
    register(shortcut, async (event) => {
      if (event.state === "Pressed") {
        try {
          // 1. Capture screen
          const b64 = await invoke<string>("capture_fullscreen");
          
          // 2. Load into canvas
          if (canvasRef.current) {
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
          
          // 3. Bring window to front
          const win = getCurrentWindow();
          await win.unminimize();
          await win.setFocus();
          showToast("Screenshot captured and ready to edit!");
        } catch (e) {
          console.error("Failed to capture screenshot:", e);
        }
      }
    }).catch(console.error);

    return () => {
      unregister(shortcut).catch(console.error);
    };
  }, [showToast]);

  return (
    <div className="app-shell">
      <TitleBar />
      <MenuBar canvasRef={canvasRef} />
      <Toolbar canvasRef={canvasRef} panelVisible={panelVisible} onTogglePanel={() => setPanelVisible(v => !v)} />
      <div className="workspace">
        {panelVisible && (
          <ShapePanel canvasRef={canvasRef} />
        )}
        <CanvasArea onCanvasReady={setCanvas} />
      </div>
      <StatusBar />
      <Toast />
    </div>
  );
}
