import { useAppStore, type ToolType } from "../store/appStore";

export default function MainToolbar() {
  const { activeTool, setActiveTool, showToast, isCaptureOverlay } = useAppStore();

  // If we are in capture overlay mode, we don't show the main drawing toolbar
  // (App.tsx might already handle this, but it's good defensive programming)
  if (isCaptureOverlay) return null;

  const handleTool = (t: ToolType) => {
    setActiveTool(t);
  };

  return (
    <div className="main-toolbar-container">
      <div className="main-toolbar">
        <button className={`tool-btn ${activeTool === "select" ? "active" : ""}`} onClick={() => handleTool("select")} title="Select">
          <PointerIcon />
        </button>
        <button className="tool-btn" onClick={() => showToast("Crop coming soon!")} title="Crop">
          <CropIcon />
        </button>
        
        <div className="toolbar-divider" />
        
        <button className={`tool-btn ${activeTool === "rect" ? "active" : ""}`} onClick={() => handleTool("rect")} title="Shapes">
          <ShapesIcon />
        </button>
        <button className={`tool-btn ${activeTool === "line" ? "active" : ""}`} onClick={() => handleTool("line")} title="Line">
          <LineIcon />
        </button>
        <button className={`tool-btn ${activeTool === "arrow" ? "active" : ""}`} onClick={() => handleTool("arrow")} title="Arrow">
          <ArrowIcon />
        </button>
        <button className={`tool-btn ${activeTool === "pencil" ? "active" : ""}`} onClick={() => handleTool("pencil")} title="Pen">
          <PenIcon />
        </button>
        <button className={`tool-btn ${activeTool === "text" ? "active" : ""}`} onClick={() => handleTool("text")} title="Text">
          <TextIcon />
        </button>
        
        <div className="toolbar-divider" />
        
        <button className="tool-btn" onClick={() => showToast("Magic coming soon!")} title="Magic Sparkles">
          <SparklesIcon />
        </button>
        <button className="tool-btn" onClick={() => showToast("Image coming soon!")} title="Image">
          <ImageIcon />
        </button>
        <button className={`tool-btn ${activeTool === "eraser" ? "active" : ""}`} onClick={() => handleTool("eraser")} title="Eraser">
          <EraserIcon />
        </button>
        <button className="tool-btn" onClick={() => showToast("Fill Color coming soon!")} title="Fill Color">
          <BucketIcon />
        </button>
        <button className="tool-btn" onClick={() => showToast("Board coming soon!")} title="Board">
          <BoardIcon />
        </button>
      </div>
    </div>
  );
}

function PointerIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>; }
function CropIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"/><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"/></svg>; }
function ShapesIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="10" height="10" rx="2"/><circle cx="16" cy="16" r="5"/></svg>; }
function LineIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"/></svg>; }
function ArrowIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="10 5 19 5 19 14"/></svg>; }
function PenIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>; }
function TextIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>; }
function SparklesIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z"/></svg>; }
function ImageIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>; }
function EraserIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20"/></svg>; }
function BucketIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.38 10l-6.8-6.8a2.53 2.53 0 00-3.58 0l-5.4 5.4a2.53 2.53 0 000 3.58l6.8 6.8a2.53 2.53 0 003.58 0l5.4-5.4a2.53 2.53 0 000-3.58z"/><path d="M2 22h20"/><path d="M10.5 6.5l7 7"/></svg>; }
function BoardIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>; }
