import { RefObject, useState, useRef, useEffect } from "react";
import type { Canvas as FabricCanvas } from "fabric";
import { useAppStore } from "../store/appStore";
import { saveSSAP, loadSSAP, SSAP_EXT } from "../formats/ssap";
import { saveWBAP, loadWBAP, WBAP_EXT } from "../formats/wbap";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { isTauri } from "@tauri-apps/api/core";

interface Props { canvasRef: RefObject<FabricCanvas | null>; }

type MenuKey = "file" | "edit" | "view" | "export";

export default function MenuBar({ canvasRef }: Props) {
  const { appMode, setAppMode, fileName, setFileName, setFilePath, filePath,
          setIsDirty, showToast, setLoading, zoom, setZoom } = useAppStore();
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (k: MenuKey) => setOpenMenu(prev => prev === k ? null : k);

  /* ---- File Operations ---- */
  const handleNew = () => {
    canvasRef.current?.clear();
    canvasRef.current?.renderAll();
    setFileName("Untitled");
    setFilePath(null);
    setIsDirty(false);
    showToast("New project created");
    setOpenMenu(null);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setOpenMenu(null);
    try {
      setLoading(true);
      const ext = appMode === "screenshot" ? SSAP_EXT : WBAP_EXT;
      let savePath = filePath;

      const isTauriEnv = isTauri();
      const data = appMode === "screenshot"
        ? await saveSSAP(canvas, fileName)
        : await saveWBAP(canvas, fileName, zoom / 100);

      if (isTauriEnv) {
        if (!savePath) {
          savePath = (await saveDialog({
            title: "Save Project",
            defaultPath: `${fileName}${ext}`,
            filters: appMode === "screenshot"
              ? [{ name: "Screenshot Project", extensions: ["ssap"] }]
              : [{ name: "Whiteboard Project", extensions: ["wbap"] }],
          })) as string | null;
          if (!savePath) return;
        }

        await writeFile(savePath, data);
        setFilePath(savePath);
        const name = savePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") ?? "Untitled";
        setFileName(name);
      } else {
        // Web fallback
        const blob = new Blob([data as any], { type: "application/octet-stream" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${fileName}${ext}`;
        a.click();
      }

      setIsDirty(false);
      showToast(`Saved project successfully`);
    } catch (err) {
      showToast(`Save failed: ${err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAs = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setOpenMenu(null);
    try {
      setLoading(true);
      const ext = appMode === "screenshot" ? SSAP_EXT : WBAP_EXT;
      
      const isTauriEnv = isTauri();
      const data = appMode === "screenshot"
        ? await saveSSAP(canvas, fileName)
        : await saveWBAP(canvas, fileName, zoom / 100);

      if (isTauriEnv) {
        const savePath = await saveDialog({
          title: "Save As",
          defaultPath: `${fileName}${ext}`,
          filters: appMode === "screenshot"
            ? [{ name: "Screenshot Project", extensions: ["ssap"] }]
            : [{ name: "Whiteboard Project", extensions: ["wbap"] }],
        }) as string | null;
        if (!savePath) return;

        await writeFile(savePath, data);
        setFilePath(savePath);
        const name = savePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") ?? "Untitled";
        setFileName(name);
      } else {
        // Web fallback
        const blob = new Blob([data as any], { type: "application/octet-stream" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${fileName}${ext}`;
        a.click();
      }

      setIsDirty(false);
      showToast(`Saved as successfully`);
    } catch (err) {
      showToast(`Save failed: ${err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setOpenMenu(null);
    try {
      setLoading(true);
      const isTauriEnv = isTauri();
      let data: ArrayBufferLike;
      let filenameStr = "";

      if (isTauriEnv) {
        const selected = await openDialog({
          title: "Open Project",
          multiple: false,
          filters: [
            { name: "ScreenshotApp Projects", extensions: ["ssap", "wbap"] },
            { name: "Screenshot Project", extensions: ["ssap"] },
            { name: "Whiteboard Project", extensions: ["wbap"] },
          ],
        }) as string | null;
        if (!selected) {
          setLoading(false);
          return;
        }
        data = await readFile(selected).then(u8 => u8.buffer);
        filenameStr = selected;
        setFilePath(selected);
      } else {
        // Web fallback
        const file = await new Promise<File | null>((resolve) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".ssap,.wbap";
          input.onchange = (e) => {
            const f = (e.target as HTMLInputElement).files?.[0];
            resolve(f || null);
          };
          input.click();
        });
        if (!file) {
          setLoading(false);
          return;
        }
        data = await file.arrayBuffer();
        filenameStr = file.name;
        setFilePath(null);
      }

      const bytes = new Uint8Array(data);
      const isWbap = filenameStr.endsWith(".wbap");

      if (isWbap) {
        setAppMode("whiteboard");
        const { manifest } = await loadWBAP(bytes, canvas);
        setZoom(Math.round(manifest.viewport.zoom * 100));
        const name = (manifest.name || filenameStr.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "")) ?? "Untitled";
        setFileName(name);
        showToast(`Opened whiteboard: ${name}`);
      } else {
        setAppMode("screenshot");
        const { manifest } = await loadSSAP(bytes, canvas);
        const name = (manifest.name || filenameStr.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "")) ?? "Untitled";
        setFileName(name);
        showToast(`Opened: ${name}`);
      }

      setIsDirty(false);
    } catch (err) {
      showToast(`Open failed: ${err}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPNG = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setOpenMenu(null);
    try {
      const savePath = await saveDialog({
        title: "Export as PNG",
        defaultPath: `${fileName}.png`,
        filters: [{ name: "PNG Image", extensions: ["png"] }],
      }) as string | null;
      if (!savePath) return;
      const dataUrl = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
      const base64 = dataUrl.split(",")[1];
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      await writeFile(savePath, bytes);
      showToast("Exported as PNG");
    } catch (err) {
      showToast(`Export failed: ${err}`, "error");
    }
  };

  return (
    <div className="menubar" ref={barRef}>
      {/* Mode Tabs */}
      <div className="mode-tabs" style={{ marginRight: 12 }}>
        <button className={`mode-tab ${appMode === "screenshot" ? "active" : ""}`}
          onClick={() => { setAppMode("screenshot"); setOpenMenu(null); }}>
          Screenshot
        </button>
        <button className={`mode-tab ${appMode === "whiteboard" ? "active" : ""}`}
          onClick={() => { setAppMode("whiteboard"); setOpenMenu(null); }}>
          Whiteboard
        </button>
      </div>

      {(["file", "edit", "view", "export"] as MenuKey[]).map((key) => (
        <div key={key} className={`menu-item ${openMenu === key ? "active" : ""}`}
          onClick={() => toggle(key)} style={{ position: "relative" }}>
          {key.charAt(0).toUpperCase() + key.slice(1)}

          {openMenu === key && (
            <div className="menu-dropdown">
              {key === "file" && <>
                <div className="menu-dropdown-item" onClick={handleNew}>
                  <span>🆕</span> New <span className="shortcut">Ctrl+N</span>
                </div>
                <div className="menu-dropdown-item" onClick={handleOpen}>
                  <span>📂</span> Open… <span className="shortcut">Ctrl+O</span>
                </div>
                <div className="menu-dropdown-separator" />
                <div className="menu-dropdown-item" onClick={handleSave}>
                  <span>💾</span> Save <span className="shortcut">Ctrl+S</span>
                </div>
                <div className="menu-dropdown-item" onClick={handleSaveAs}>
                  <span>💾</span> Save As… <span className="shortcut">Ctrl+Shift+S</span>
                </div>
              </>}
              {key === "edit" && <>
                <div className="menu-dropdown-item" onClick={() => { (canvasRef.current as any)?._historyUndo?.(); setOpenMenu(null); }}>
                  <span>↩</span> Undo <span className="shortcut">Ctrl+Z</span>
                </div>
                <div className="menu-dropdown-item" onClick={() => { (canvasRef.current as any)?._historyRedo?.(); setOpenMenu(null); }}>
                  <span>↪</span> Redo <span className="shortcut">Ctrl+Y</span>
                </div>
                <div className="menu-dropdown-separator" />
                <div className="menu-dropdown-item" onClick={() => {
                  const obj = canvasRef.current?.getActiveObject();
                  if (obj) canvasRef.current?.remove(obj);
                  setOpenMenu(null);
                }}>
                  <span>🗑</span> Delete
                </div>
                <div className="menu-dropdown-item" onClick={() => {
                  canvasRef.current?.discardActiveObject();
                  const allObjs = canvasRef.current?.getObjects() ?? [];
                  if (allObjs.length > 0) {
                    const { ActiveSelection } = (window as any).__fabricNS ?? {};
                    if (ActiveSelection) {
                      const sel = new ActiveSelection(allObjs, { canvas: canvasRef.current });
                      canvasRef.current?.setActiveObject(sel);
                    }
                  }
                  canvasRef.current?.requestRenderAll();
                  setOpenMenu(null);
                }}>
                  <span>⬜</span> Select All <span className="shortcut">Ctrl+A</span>
                </div>
              </>}
              {key === "view" && <>
                <div className="menu-dropdown-item" onClick={() => { setZoom(100); setOpenMenu(null); }}>
                  <span>🔍</span> Zoom 100% <span className="shortcut">Ctrl+0</span>
                </div>
                <div className="menu-dropdown-item" onClick={() => { setZoom(Math.min(zoom + 25, 400)); setOpenMenu(null); }}>
                  <span>➕</span> Zoom In <span className="shortcut">Ctrl++</span>
                </div>
                <div className="menu-dropdown-item" onClick={() => { setZoom(Math.max(zoom - 25, 25)); setOpenMenu(null); }}>
                  <span>➖</span> Zoom Out <span className="shortcut">Ctrl+-</span>
                </div>
              </>}
              {key === "export" && <>
                <div className="menu-dropdown-item" onClick={handleExportPNG}>
                  <span>🖼</span> Export as PNG…
                </div>
                <div className="menu-dropdown-item" onClick={() => {
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const dataUrl = canvas.toDataURL({ format: "jpeg", quality: 0.95, multiplier: 2 });
                  const a = document.createElement("a");
                  a.href = dataUrl;
                  a.download = `${fileName}.jpg`;
                  a.click();
                  setOpenMenu(null);
                }}>
                  <span>🖼</span> Export as JPG…
                </div>
                <div className="menu-dropdown-item" onClick={() => {
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const svg = canvas.toSVG();
                  const blob = new Blob([svg], { type: "image/svg+xml" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `${fileName}.svg`;
                  a.click();
                  setOpenMenu(null);
                }}>
                  <span>📐</span> Export as SVG…
                </div>
              </>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
