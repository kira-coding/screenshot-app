import { useEffect, useState, RefObject } from "react";
import * as fabric from "fabric";
import { useAppStore } from "../store/appStore";

interface Props {
  canvasRef: RefObject<fabric.Canvas | null>;
}

export default function FloatingContextMenu({ canvasRef }: Props) {
  const [activeObj, setActiveObj] = useState<fabric.Object | null>(null);
  const [position, setPosition] = useState({ top: -9999, left: -9999 });
  const { showToast } = useAppStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateMenu = () => {
      const obj = canvas.getActiveObject();
      if (!obj) {
        setActiveObj(null);
        return;
      }
      
      setActiveObj(obj);
      
      // Calculate position above the object
      const boundingRect = obj.getBoundingRect();
      const canvasEl = canvas.getElement().parentElement;
      if (!canvasEl) return;
      
      const canvasRect = canvasEl.getBoundingClientRect();
      const zoom = canvas.getZoom();
      
      // Position menu centered above the object
      const menuWidth = 300; // estimated
      const left = canvasRect.left + (boundingRect.left * zoom) + ((boundingRect.width * zoom) / 2) - (menuWidth / 2);
      const top = canvasRect.top + (boundingRect.top * zoom) - 60; // 60px above
      
      setPosition({ 
        top: Math.max(10, top), 
        left: Math.max(10, Math.min(left, window.innerWidth - menuWidth - 10)) 
      });
    };

    canvas.on("selection:created", updateMenu);
    canvas.on("selection:updated", updateMenu);
    canvas.on("selection:cleared", () => setActiveObj(null));
    canvas.on("object:moving", updateMenu);
    canvas.on("object:scaling", updateMenu);
    canvas.on("object:rotating", updateMenu);

    return () => {
      canvas.off("selection:created", updateMenu);
      canvas.off("selection:updated", updateMenu);
      canvas.off("selection:cleared");
      canvas.off("object:moving", updateMenu);
      canvas.off("object:scaling", updateMenu);
      canvas.off("object:rotating", updateMenu);
    };
  }, [canvasRef]);

  if (!activeObj) return null;

  const isText = activeObj instanceof fabric.IText || activeObj instanceof fabric.Textbox;
  const isArrow = (activeObj as any)?.data?.type === "arrow" || activeObj instanceof fabric.Line;

  const handleDelete = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.remove(...canvas.getActiveObjects());
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
  };

  return (
    <div 
      className="floating-context-menu"
      style={{ top: position.top, left: position.left, position: 'fixed' }}
    >
      <div className="menu-drag-handle">
        <DragIcon />
      </div>
      
      <div className="menu-divider" />

      {isText ? (
        <>
          <button className="menu-btn dropdown-btn" onClick={() => showToast("Font picker coming soon!")}>
            Inter <ChevronDownIcon />
          </button>
          <div className="menu-divider" />
          <button className="menu-btn" onClick={() => showToast("Size decrease coming soon!")}>−</button>
          <span className="menu-text">14</span>
          <button className="menu-btn" onClick={() => showToast("Size increase coming soon!")}>+</button>
          <div className="menu-divider" />
          <button className="menu-btn" style={{ fontWeight: 'bold' }}>B</button>
          <button className="menu-btn" style={{ textDecoration: 'underline' }}>U</button>
          <button className="menu-btn" style={{ fontStyle: 'italic' }}>I</button>
          <button className="menu-btn" style={{ textDecoration: 'line-through' }}>S</button>
          <div className="menu-divider" />
          <button className="menu-btn"><AlignLeftIcon /></button>
          <button className="menu-btn" style={{ textDecoration: 'underline', textDecorationColor: '#5BBFAD' }}>A</button>
          <button className="menu-btn" onClick={() => showToast("Background color coming soon!")}><BucketIcon /></button>
        </>
      ) : isArrow ? (
        <>
          <button className="menu-btn" onClick={() => showToast("Width decrease coming soon!")}>−</button>
          <button className="menu-btn" onClick={() => showToast("Stroke style coming soon!")}><LineIcon /></button>
          <button className="menu-btn" onClick={() => showToast("Width increase coming soon!")}>+</button>
          <button className="menu-btn color-indicator" style={{ color: '#5BBFAD' }} onClick={() => showToast("Color coming soon!")}>
            <circle cx="12" cy="12" r="6" fill="currentColor" />
          </button>
          <div className="menu-divider" />
          <button className="menu-btn"><DashIcon /></button>
          <button className="menu-btn"><CapIcon /></button>
        </>
      ) : (
        // Standard Shape
        <>
          <button className="menu-btn" onClick={() => showToast("Stroke decrease coming soon!")}>−</button>
          <button className="menu-btn"><LineIcon /></button>
          <button className="menu-btn" onClick={() => showToast("Stroke increase coming soon!")}>+</button>
          <button className="menu-btn color-indicator" style={{ color: '#5BBFAD' }} onClick={() => showToast("Color coming soon!")}>
            <circle cx="12" cy="12" r="6" fill="currentColor" />
          </button>
          <div className="menu-divider" />
          <button className="menu-btn"><DashIcon /></button>
          <button className="menu-btn"><BucketIcon /></button>
        </>
      )}

      <div className="menu-divider" />
      <button className="menu-btn danger" onClick={handleDelete} title="Delete">
        <TrashIcon />
      </button>
      <button className="menu-btn" onClick={() => showToast("More options coming soon!")}>
        <MoreIcon />
      </button>
    </div>
  );
}

// Icons
function DragIcon() { return <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><circle cx="9" cy="8" r="1.5"/><circle cx="15" cy="8" r="1.5"/><circle cx="9" cy="16" r="1.5"/><circle cx="15" cy="16" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/></svg>; }
function ChevronDownIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg>; }
function AlignLeftIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="19" y2="18"/></svg>; }
function BucketIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M19.38 10l-6.8-6.8a2.53 2.53 0 00-3.58 0l-5.4 5.4a2.53 2.53 0 000 3.58l6.8 6.8a2.53 2.53 0 003.58 0l5.4-5.4a2.53 2.53 0 000-3.58z"/><path d="M2 22h20"/><path d="M10.5 6.5l7 7"/></svg>; }
function TrashIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>; }
function MoreIcon() { return <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>; }
function LineIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="4" y1="12" x2="20" y2="12"/></svg>; }
function DashIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="4" y1="12" x2="8" y2="12"/><line x1="12" y1="12" x2="16" y2="12"/><line x1="20" y1="12" x2="21" y2="12"/></svg>; }
function CapIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="18" cy="12" r="3"/><line x1="4" y1="12" x2="15" y2="12"/></svg>; }
