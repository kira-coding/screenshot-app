import { RefObject } from "react";
import type { Canvas as FabricCanvas } from "fabric";
import { useAppStore, type ToolType } from "../store/appStore";
import { invoke } from "@tauri-apps/api/core";
import * as fabric from "fabric";

interface Props {
  canvasRef: RefObject<FabricCanvas | null>;
  panelVisible: boolean;
  onTogglePanel: () => void;
}

interface ToolDef { id: ToolType; label: string; icon: React.ReactNode; }

const CAPTURE_MODES = [
  { id: "fullscreen" as const, label: "Fullscreen", icon: <CamIcon /> },
  { id: "region"     as const, label: "Region",     icon: <RegionIcon /> },
  { id: "window"     as const, label: "Window",     icon: <WindowIcon /> },
  { id: "scrolling"  as const, label: "Scroll",     icon: <ScrollIcon /> },
];

const ANNOTATION_TOOLS: ToolDef[] = [
  { id: "select",      label: "Select",      icon: <SelectIcon /> },
  { id: "move",        label: "Move",        icon: <MoveIcon /> },
  { id: "rect",        label: "Rectangle",   icon: <RectIcon /> },
  { id: "circle",      label: "Circle",      icon: <CircleIcon /> },
  { id: "line",        label: "Line",        icon: <LineIcon /> },
  { id: "arrow",       label: "Arrow",       icon: <ArrowIcon /> },
  { id: "pencil",      label: "Pencil",      icon: <PencilIcon /> },
  { id: "highlighter", label: "Highlighter", icon: <HighlightIcon /> },
  { id: "text",        label: "Text",        icon: <TextIcon /> },
];

export default function Toolbar({ canvasRef, panelVisible, onTogglePanel }: Props) {
  const {
    activeTool, setActiveTool, captureMode, setCaptureMode,
    appMode, canUndo, canRedo, showToast,
    setIsDirty
  } = useAppStore();

  const handleToolSelect = (tool: ToolType) => {
    setActiveTool(tool);
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reset drawing modes
    canvas.isDrawingMode = false;
    canvas.selection = tool === "select";
    canvas.defaultCursor = tool === "move" ? "grab" : "default";

    if (tool === "pencil" || tool === "highlighter") {
      canvas.isDrawingMode = true;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.width = tool === "highlighter" ? 20 : 3;
        canvas.freeDrawingBrush.color = tool === "highlighter"
          ? "rgba(255,235,59,0.5)"
          : "#1A1A1A";
      }
    }
  };

  const handleDelete = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length === 0) return;
    active.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    setIsDirty(true);
  };

  const handleDuplicate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    active.clone().then((cloned: any) => {
      cloned.set({ left: (cloned.left ?? 0) + 20, top: (cloned.top ?? 0) + 20 });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
      setIsDirty(true);
    });
  };

  const handleUndo = () => {
    (canvasRef.current as any)?._historyUndo?.();
  };
  const handleRedo = () => {
    (canvasRef.current as any)?._historyRedo?.();
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "screenshot.png";
    a.click();
    showToast("Exported as PNG");
  };

  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL({ format: "png", multiplier: 2 });
      const blob = await fetch(dataUrl).then(r => r.blob());
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showToast("Copied to clipboard");
    } catch {
      showToast("Clipboard copy failed", "error");
    }
  };

  const handleCapture = async (mode: string) => {
    setCaptureMode(mode as any);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    try {
      let base64Image = "";
      if (mode === "fullscreen" || mode === "window" || mode === "scrolling") {
        // Use fullscreen as fallback for unimplemented modes for now
        base64Image = await invoke("capture_fullscreen");
      } else if (mode === "region") {
        // Hardcoded region for demo purposes, would normally use an overlay UI
        base64Image = await invoke("capture_region", { x: 100, y: 100, width: 800, height: 600 });
      }

      if (base64Image) {
        const img = await fabric.FabricImage.fromURL(base64Image);
        
        // Scale down if image is larger than canvas
        const w = img.width ?? 1;
        const h = img.height ?? 1;
        const scaleX = (canvas.width ?? 800) / w;
        const scaleY = (canvas.height ?? 600) / h;
        const scale = Math.min(scaleX, scaleY, 1);
        
        img.scale(scale);
        img.set({
          left: ((canvas.width ?? 800) - w * scale) / 2,
          top: ((canvas.height ?? 600) - h * scale) / 2,
          selectable: true,
          evented: true,
        });

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();
        setIsDirty(true);
        showToast("Screen captured successfully");
      }
    } catch (err) {
      showToast(`Capture failed: ${err}`, "error");
    }
  };

  return (
    <div className="toolbar">
      {/* Capture Mode Cluster */}
      {appMode === "screenshot" && (
        <>
          <div className="capture-modes">
            {CAPTURE_MODES.map(m => (
              <button
                key={m.id}
                className={`capture-mode-btn ${captureMode === m.id ? "active" : ""}`}
                title={m.label}
                onClick={() => handleCapture(m.id)}
              >
                {m.icon}
              </button>
            ))}
          </div>
          <div className="toolbar-divider" />
        </>
      )}

      {/* Panel Toggle */}
      <button className={`tool-btn ${panelVisible ? "active" : ""}`}
        title="Toggle Panel" onClick={onTogglePanel}>
        <PanelIcon />
      </button>
      <div className="toolbar-divider" />

      {/* Annotation Tools */}
      <div className="toolbar-group">
        {ANNOTATION_TOOLS.map(t => (
          <button
            key={t.id}
            className={`tool-btn ${activeTool === t.id ? "active" : ""}`}
            title={t.label}
            onClick={() => handleToolSelect(t.id)}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      {/* History */}
      <div className="toolbar-group">
        <button className="tool-btn" title="Undo (Ctrl+Z)" onClick={handleUndo} disabled={!canUndo}
          style={{ opacity: canUndo ? 1 : 0.4 }}>
          <UndoIcon />
        </button>
        <button className="tool-btn" title="Redo (Ctrl+Y)" onClick={handleRedo} disabled={!canRedo}
          style={{ opacity: canRedo ? 1 : 0.4 }}>
          <RedoIcon />
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Object Actions */}
      <div className="toolbar-group">
        <button className="tool-btn danger" title="Delete" onClick={handleDelete}><TrashIcon /></button>
        <button className="tool-btn" title="Duplicate" onClick={handleDuplicate}><DupeIcon /></button>
        <button className="tool-btn" title="Copy to Clipboard" onClick={handleCopyToClipboard}><CopyIcon /></button>
        <button className="tool-btn" title="Export PNG" onClick={handleExportPNG}><DownloadIcon /></button>
      </div>

      <div className="toolbar-spacer" />

      {/* Share */}
      <button className="btn-primary" onClick={() => showToast("Share coming soon", "info")}>
        <ShareIcon /> Share
      </button>
    </div>
  );
}

/* ---- SVG Icons ---- */
function CamIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="14" height="10" rx="2"/><circle cx="9" cy="10" r="2.5"/><path d="M6 5V4a1 1 0 011-1h4a1 1 0 011 1v1"/></svg>; }
function RegionIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="12" height="12" rx="1" strokeDasharray="3 2"/></svg>; }
function WindowIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="14" height="12" rx="2"/><line x1="2" y1="7" x2="16" y2="7"/></svg>; }
function ScrollIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="2" width="10" height="14" rx="2"/><line x1="7" y1="6" x2="11" y2="6"/><line x1="7" y1="9" x2="11" y2="9"/><line x1="7" y1="12" x2="11" y2="12"/></svg>; }
function SelectIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l5.5 13 2.5-5.5L16 8 3 3z"/></svg>; }
function MoveIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 2v14M2 9h14M9 2l-2 3M9 2l2 3M9 16l-2-3M9 16l2-3M2 9l3-2M2 9l3 2M16 9l-3-2M16 9l-3 2"/></svg>; }
function RectIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="12" height="10" rx="2"/></svg>; }
function CircleIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="9" r="6"/></svg>; }
function LineIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="15" x2="15" y2="3"/></svg>; }
function ArrowIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="15" x2="15" y2="3"/><path d="M15 3l-5 1 4 4 1-5z" fill="currentColor" stroke="none"/></svg>; }
function PencilIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 3l2 2-9 9H4v-2l9-9z"/></svg>; }
function HighlightIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 14h12M6 14l2-4h2l2 4M8 10V5l1-2 1 2v5"/></svg>; }
function TextIcon() { return <svg viewBox="0 0 18 18" fill="currentColor"><path d="M3 4h12v2H10v8H8V6H3z"/></svg>; }
function UndoIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 8H3V5M3 8a7 7 0 110 5"/></svg>; }
function RedoIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 8h2V5M15 8a7 7 0 100 5"/></svg>; }
function TrashIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 5h12M8 8v5M10 8v5M6 5V4a1 1 0 011-1h4a1 1 0 011 1v1M5 5l1 10h6l1-10"/></svg>; }
function DupeIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="6" y="6" width="9" height="9" rx="1.5"/><path d="M3 12V3h9"/></svg>; }
function CopyIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="11" height="11" rx="1.5"/><rect x="5" y="5" width="11" height="11" rx="1.5"/></svg>; }
function DownloadIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 3v9M5 9l4 4 4-4M3 15h12"/></svg>; }
function ShareIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5" width="16" height="16"><circle cx="14" cy="4" r="2"/><circle cx="4" cy="9" r="2"/><circle cx="14" cy="14" r="2"/><line x1="6" y1="10" x2="12" y2="13"/><line x1="6" y1="8" x2="12" y2="5"/></svg>; }
function PanelIcon() { return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="14" height="14" rx="2"/><line x1="7" y1="2" x2="7" y2="16"/></svg>; }
