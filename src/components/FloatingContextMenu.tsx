import { useEffect, useState, RefObject } from "react";
import * as fabric from "fabric";
import { useAppStore } from "../store/appStore";

interface Props {
  canvasRef: RefObject<fabric.Canvas | null>;
}

export default function FloatingContextMenu({ canvasRef }: Props) {
  const [activeObj, setActiveObj] = useState<fabric.Object | null>(null);
  const [position, setPosition] = useState({ top: -9999, left: -9999 });
  const { showToast, setIsRecordOverlay } = useAppStore();

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

  const updateObj = (key: string, value: any) => {
    const canvas = canvasRef.current;
    if (canvas && activeObj) {
      activeObj.set(key, value);
      canvas.requestRenderAll();
      // force re-render to update UI values
      setActiveObj({...activeObj} as any);
      setActiveObj(canvas.getActiveObject() ?? null);
    }
  };

  const handleFontSize = (delta: number) => {
    const current = (activeObj as any).fontSize || 16;
    updateObj('fontSize', Math.max(8, current + delta));
  };

  const handleStrokeWidth = (delta: number) => {
    const current = activeObj.strokeWidth || 2;
    updateObj('strokeWidth', Math.max(1, current + delta));
  };

  const handleStrokeStyle = () => {
    const dash = activeObj.strokeDashArray;
    if (!dash || dash.length === 0) {
      updateObj('strokeDashArray', [10, 5]); // Dashed
    } else if (dash[0] === 10) {
      updateObj('strokeDashArray', [3, 4]); // Dotted
    } else {
      updateObj('strokeDashArray', null); // Solid
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
          <button className="menu-btn dropdown-btn">
            Inter <ChevronDownIcon />
          </button>
          <div className="menu-divider" />
          <button className="menu-btn" onClick={() => handleFontSize(-2)} title="Decrease Font"><MinusIcon /></button>
          <span className="menu-text">{Math.round((activeObj as any)?.fontSize || 16)}</span>
          <button className="menu-btn" onClick={() => handleFontSize(2)} title="Increase Font"><PlusIcon /></button>
          <div className="menu-divider" />
          <button className="menu-btn" style={{ fontWeight: 'bold' }} onClick={() => updateObj('fontWeight', (activeObj as any).fontWeight === 'bold' ? 'normal' : 'bold')}>B</button>
          <button className="menu-btn" style={{ textDecoration: 'underline' }} onClick={() => updateObj('underline', !(activeObj as any).underline)}>U</button>
          <button className="menu-btn" style={{ fontStyle: 'italic' }} onClick={() => updateObj('fontStyle', (activeObj as any).fontStyle === 'italic' ? 'normal' : 'italic')}>I</button>
          <button className="menu-btn" style={{ textDecoration: 'line-through' }} onClick={() => updateObj('linethrough', !(activeObj as any).linethrough)}>S</button>
          <div className="menu-divider" />
          <button className="menu-btn" onClick={() => updateObj('textAlign', 'left')}><AlignLeftIcon /></button>
          <label className="menu-btn" style={{ textDecoration: 'underline', textDecorationColor: String((activeObj as any).fill || '#5BBFAD'), cursor: 'pointer' }}>
            A
            <input type="color" value={String((activeObj as any).fill || '#5BBFAD').startsWith('#') ? String((activeObj as any).fill || '#5BBFAD') : '#5BBFAD'} onChange={(e) => updateObj('fill', e.target.value)} style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }} />
          </label>
          <label className="menu-btn" style={{ cursor: 'pointer' }}>
            <BucketIcon />
            <input type="color" value={String((activeObj as any).backgroundColor || '#ffffff').startsWith('#') ? String((activeObj as any).backgroundColor || '#ffffff') : '#ffffff'} onChange={(e) => updateObj('backgroundColor', e.target.value)} style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }} />
          </label>
        </>
      ) : isArrow ? (
        <>
          <button className="menu-btn" onClick={() => handleStrokeWidth(-1)} title="Decrease Width"><MinusIcon /></button>
          <span className="menu-text">{Math.round((activeObj as any)?.strokeWidth || 2)}</span>
          <button className="menu-btn" onClick={() => handleStrokeWidth(1)} title="Increase Width"><PlusIcon /></button>
          <label className="menu-btn color-indicator" style={{ color: String(activeObj.stroke || '#5BBFAD'), cursor: 'pointer' }}>
            <circle cx="12" cy="12" r="6" fill="currentColor" />
            <input type="color" value={String(activeObj.stroke || '#5BBFAD').startsWith('#') ? String(activeObj.stroke || '#5BBFAD') : '#5BBFAD'} onChange={(e) => updateObj('stroke', e.target.value)} style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }} />
          </label>
          <div className="menu-divider" />
          <button className="menu-btn" onClick={handleStrokeStyle}><DashIcon /></button>
          <button className="menu-btn"><CapIcon /></button>
        </>
      ) : (
        // Standard Shape
        <>
          <button className="menu-btn" onClick={() => handleStrokeWidth(-1)} title="Decrease Width"><MinusIcon /></button>
          <span className="menu-text">{Math.round((activeObj as any)?.strokeWidth || 2)}</span>
          <button className="menu-btn" onClick={() => handleStrokeWidth(1)} title="Increase Width"><PlusIcon /></button>
          <label className="menu-btn color-indicator" style={{ color: String(activeObj.stroke || '#5BBFAD'), cursor: 'pointer' }}>
            <circle cx="12" cy="12" r="6" fill="currentColor" />
            <input type="color" value={String(activeObj.stroke || '#5BBFAD').startsWith('#') ? String(activeObj.stroke || '#5BBFAD') : '#5BBFAD'} onChange={(e) => updateObj('stroke', e.target.value)} style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }} />
          </label>
          <div className="menu-divider" />
          <button className="menu-btn" onClick={handleStrokeStyle}><DashIcon /></button>
          <label className="menu-btn" style={{ cursor: 'pointer' }}>
            <BucketIcon />
            <input type="color" value={String(activeObj.fill || '#ffffff').startsWith('#') ? String(activeObj.fill || '#ffffff') : '#ffffff'} onChange={(e) => updateObj('fill', e.target.value)} style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }} />
          </label>
        </>
      )}

      <div className="menu-divider" />
      <button className="menu-btn" title="Capture Clip" onClick={() => setIsRecordOverlay(true)}>
        <VideoIcon />
      </button>
      <div className="menu-divider" />
      <button className="menu-btn danger" onClick={handleDelete} title="Delete">
        <TrashIcon />
      </button>
      <div className="menu-divider" />
      <button className="menu-btn" title="Duplicate" onClick={async () => {
        const canvas = canvasRef.current;
        const obj = canvas?.getActiveObject();
        if (canvas && obj) {
          const cloned = await obj.clone();
          cloned.set({
            left: obj.left! + 20,
            top: obj.top! + 20,
          });
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
          canvas.requestRenderAll();
        }
      }}>
        <CopyIcon />
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
function CopyIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>; }
function VideoIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>; }
function PlusIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function MinusIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
