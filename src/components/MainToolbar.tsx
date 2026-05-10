import { RefObject, useState, useRef, useEffect } from "react";
import * as fabric from "fabric";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { useAppStore, type ToolType } from "../store/appStore";

interface Props {
  canvasRef?: RefObject<fabric.Canvas | null>;
}

// ─── Shape submenu items ──────────────────────────────────────────────────────
const SHAPES: { tool: ToolType; label: string; icon: () => JSX.Element }[] = [
  { tool: "rect",     label: "Rectangle",  icon: RectIcon },
  { tool: "circle",   label: "Circle",     icon: CircleIcon },
  { tool: "triangle", label: "Triangle",   icon: TriangleIcon },
  { tool: "line",     label: "Line",       icon: LineIcon },
  { tool: "arrow",    label: "Arrow",      icon: ArrowIcon },
];

export default function MainToolbar({ canvasRef }: Props) {
  const {
    activeTool, setActiveTool, showToast, isCaptureOverlay,
    fillColor, setFillColor, strokeColor, setStrokeColor, showGrid, setShowGrid
  } = useAppStore();

  const [shapesOpen, setShapesOpen] = useState(false);
  const shapesRef = useRef<HTMLDivElement>(null);

  // Close shape submenu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (shapesRef.current && !shapesRef.current.contains(e.target as Node)) {
        setShapesOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (isCaptureOverlay) return null;

  const handleTool = (t: ToolType) => setActiveTool(t);

  const handleImageImport = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] }]
      });
      if (selected && canvasRef?.current) {
        const fileData = await readFile(selected as string);
        const blob = new Blob([fileData]);
        const url = URL.createObjectURL(blob);
        const imgEl = new Image();
        imgEl.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          
          const center = canvas.getCenterPoint();
          const fImg = new fabric.FabricImage(imgEl, { 
            left: center.x, 
            top: center.y, 
            originX: 'center', 
            originY: 'center',
            selectable: true 
          });
          fImg.scaleToWidth(Math.min(imgEl.width, canvas.width! * 0.8));
          canvas.add(fImg);
          canvas.setActiveObject(fImg);
          canvas.requestRenderAll();
          URL.revokeObjectURL(url);
        };
        imgEl.src = url;
      }
    } catch (e) {
      showToast("Failed to load image", "error");
    }
  };

  // Crop: Enter crop mode — user draws a rect, then we crop the canvas to that region
  const handleCrop = () => {
    const canvas = canvasRef?.current;
    if (!canvas) return;
    // Set tool to rect temporarily for crop region drawing
    setActiveTool("crop" as ToolType);
    showToast("Draw a rectangle to crop the canvas area", "info");
  };

  // Whiteboard: clear canvas and switch to whiteboard mode
  const handleWhiteboard = () => {
    const canvas = canvasRef?.current;
    if (!canvas) return;
    const { setAppMode } = useAppStore.getState();
    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.requestRenderAll();
    setAppMode("whiteboard");
    showToast("Whiteboard mode — canvas cleared!");
  };

  const isShapeActive = SHAPES.some(s => s.tool === activeTool);
  const activeShape = SHAPES.find(s => s.tool === activeTool) ?? SHAPES[0];

  return (
    <div className="main-toolbar-container">
      <div className="main-toolbar">

        {/* ── GROUP 1: Selection tools ── */}
        <button
          className={`tool-btn ${activeTool === "select" ? "active" : ""}`}
          onClick={() => handleTool("select")} title="Select (V)"
        >
          <PointerIcon />
        </button>
        <button
          className={`tool-btn ${activeTool === "move" ? "active" : ""}`}
          onClick={() => handleTool("move")} title="Pan / Move (H)"
        >
          <MoveIcon />
        </button>
        <button className="tool-btn" onClick={handleCrop} title="Crop region">
          <CropIcon />
        </button>

        <div className="toolbar-divider" />

        {/* ── GROUP 2: Shapes submenu ── */}
        <div className="tool-btn-group" ref={shapesRef}>
          <button
            className={`tool-btn tool-btn--split ${isShapeActive ? "active" : ""}`}
            onClick={() => { handleTool(activeShape.tool); setShapesOpen(false); }}
            title={activeShape.label}
          >
            <activeShape.icon />
          </button>
          <button
            className={`tool-btn tool-btn--chevron ${shapesOpen ? "active" : ""}`}
            onClick={() => setShapesOpen(o => !o)}
            title="More shapes"
          >
            <ChevronDownIcon />
          </button>
          {shapesOpen && (
            <div className="tool-submenu">
              {SHAPES.map(s => (
                <button
                  key={s.tool}
                  className={`submenu-item ${activeTool === s.tool ? "active" : ""}`}
                  onClick={() => { handleTool(s.tool); setShapesOpen(false); }}
                >
                  <s.icon /> {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── GROUP 3: Drawing tools ── */}
        <button
          className={`tool-btn ${activeTool === "pencil" ? "active" : ""}`}
          onClick={() => handleTool("pencil")} title="Pen / Pencil (P)"
        >
          <PenIcon />
        </button>
        <button
          className={`tool-btn ${activeTool === "highlighter" ? "active" : ""}`}
          onClick={() => handleTool("highlighter")} title="Highlighter"
        >
          <HighlighterIcon />
        </button>
        <button
          className={`tool-btn ${activeTool === "text" ? "active" : ""}`}
          onClick={() => handleTool("text")} title="Text (T)"
        >
          <TextIcon />
        </button>
        <button
          className={`tool-btn ${activeTool === "eraser" ? "active" : ""}`}
          onClick={() => handleTool("eraser")} title="Eraser (E)"
        >
          <EraserIcon />
        </button>

        <div className="toolbar-divider" />

        {/* ── GROUP 4: Media & Color ── */}
        <button className="tool-btn" onClick={handleImageImport} title="Import Image">
          <ImageIcon />
        </button>

        <label className="tool-btn" title="Stroke Color" style={{ cursor: 'pointer', position: 'relative' }}>
          <StrokeColorIcon color={strokeColor} />
          <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
          />
        </label>

        <label className="tool-btn" title="Fill Color" style={{ cursor: 'pointer', position: 'relative' }}>
          <FillColorIcon color={fillColor} />
          <input
            type="color"
            value={fillColor}
            onChange={(e) => setFillColor(e.target.value)}
            style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
          />
        </label>

        <div className="toolbar-divider" />

        {/* ── GROUP 5: View ── */}
        <button
          className={`tool-btn ${showGrid ? "active" : ""}`}
          onClick={() => setShowGrid(!showGrid)} title="Toggle Grid"
        >
          <GridIcon />
        </button>
        <button
          className="tool-btn"
          title="AI Magic (Coming Soon)"
          onClick={() => showToast("AI Magic — coming soon! ✨", "info")}
        >
          <SparklesIcon />
          <span className="soon-badge">Soon</span>
        </button>
        <button
          className={`tool-btn ${useAppStore.getState().appMode === 'whiteboard' ? 'active' : ''}`}
          title="Whiteboard Mode"
          onClick={handleWhiteboard}
        >
          <BoardIcon />
        </button>

      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function PointerIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>; }
function MoveIcon()        { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>; }
function CropIcon()        { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.13 1L6 16a2 2 0 002 2h15"/><path d="M1 6.13L16 6a2 2 0 012 2v15"/></svg>; }
function RectIcon()        { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>; }
function CircleIcon()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/></svg>; }
function TriangleIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 22h20L12 2z"/></svg>; }
function LineIcon()        { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"/></svg>; }
function ArrowIcon()       { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="10 5 19 5 19 14"/></svg>; }
function PenIcon()         { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>; }
function HighlighterIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 2.1L21.9 8.5 8.5 21.9 2.1 15.5 15.5 2.1z"/><path d="M2 22l4-4"/></svg>; }
function TextIcon()        { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>; }
function EraserIcon()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20"/></svg>; }
function ImageIcon()       { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>; }
function GridIcon()        { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function SparklesIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z"/></svg>; }
function BoardIcon()       { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>; }
function ChevronDownIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="10" height="10"><polyline points="6 9 12 15 18 9"/></svg>; }
function StrokeColorIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z"/>
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
      <rect x="2" y="20" width="20" height="3" rx="1" fill={color} stroke="none"/>
    </svg>
  );
}
function FillColorIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.38 10l-6.8-6.8a2.53 2.53 0 00-3.58 0l-5.4 5.4a2.53 2.53 0 000 3.58l6.8 6.8a2.53 2.53 0 003.58 0l5.4-5.4a2.53 2.53 0 000-3.58z"/>
      <rect x="2" y="20" width="20" height="3" rx="1" fill={color} stroke="none"/>
    </svg>
  );
}
