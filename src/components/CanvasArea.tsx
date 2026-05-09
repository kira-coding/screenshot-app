import { useEffect, useRef, useCallback } from "react";
import * as fabric from "fabric";
import { useAppStore } from "../store/appStore";

interface Props {
  onCanvasReady: (canvas: fabric.Canvas) => void;
}

// Undo/redo history stack (outside component to avoid re-renders)
const history: string[] = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

function pushHistory(canvas: fabric.Canvas, setCanUndo: (v: boolean) => void, setCanRedo: (v: boolean) => void) {
  const json = JSON.stringify(canvas.toJSON());
  // Remove any forward history
  history.splice(historyIndex + 1);
  history.push(json);
  if (history.length > MAX_HISTORY) history.shift();
  historyIndex = history.length - 1;
  setCanUndo(historyIndex > 0);
  setCanRedo(false);
}

function doUndo(canvas: fabric.Canvas, setCanUndo: (v: boolean) => void, setCanRedo: (v: boolean) => void) {
  if (historyIndex <= 0) return;
  historyIndex--;
  canvas.loadFromJSON(JSON.parse(history[historyIndex])).then(() => {
    canvas.requestRenderAll();
    setCanUndo(historyIndex > 0);
    setCanRedo(historyIndex < history.length - 1);
  });
}

function doRedo(canvas: fabric.Canvas, setCanUndo: (v: boolean) => void, setCanRedo: (v: boolean) => void) {
  if (historyIndex >= history.length - 1) return;
  historyIndex++;
  canvas.loadFromJSON(JSON.parse(history[historyIndex])).then(() => {
    canvas.requestRenderAll();
    setCanUndo(historyIndex > 0);
    setCanRedo(historyIndex < history.length - 1);
  });
}

export default function CanvasArea({ onCanvasReady }: Props) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const isDrawingRef = useRef(false);
  const originRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activeShapeRef = useRef<fabric.Object | null>(null);

  const {
    activeTool, setActiveTool, fillColor, strokeColor, opacity,
    strokeWidth, borderRadius, borderStyle,
    fontSize, zoom, setZoom,
    setCanUndo, setCanRedo, setIsDirty, showToast, showGrid, setShowGrid
  } = useAppStore();

  // Expose undo/redo on the canvas object for toolbar/menu to call
  const attachHistoryMethods = useCallback((canvas: fabric.Canvas) => {
    (canvas as any)._historyUndo = () => doUndo(canvas, setCanUndo, setCanRedo);
    (canvas as any)._historyRedo = () => doRedo(canvas, setCanUndo, setCanRedo);
  }, [setCanUndo, setCanRedo]);

  // Initialize Fabric canvas once
  useEffect(() => {
    const el = canvasElRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    const canvas = new fabric.Canvas(el, {
      width: w,
      height: h,
      backgroundColor: "#E8F0EF",
      selection: true,
      preserveObjectStacking: true,
      renderOnAddRemove: false,
      enableRetinaScaling: true,
    });

    fabricRef.current = canvas;
    attachHistoryMethods(canvas);
    onCanvasReady(canvas);

    // Initial history snapshot
    pushHistory(canvas, setCanUndo, setCanRedo);

    // Resize observer
    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (!containerRef.current || !fabricRef.current) return;
        const nw = containerRef.current.clientWidth;
        const nh = containerRef.current.clientHeight;
        fabricRef.current.setDimensions({ width: nw, height: nh });
        fabricRef.current.requestRenderAll();
      });
    });
    ro.observe(container);

    // Keyboard shortcuts
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") { e.preventDefault(); doUndo(canvas, setCanUndo, setCanRedo); }
        if (e.key === "y") { e.preventDefault(); doRedo(canvas, setCanUndo, setCanRedo); }
        if (e.key === "s") { e.preventDefault(); /* handled by menubar */ }
      } else {
        // Tool shortcuts
        switch (e.key.toLowerCase()) {
          case "v": setActiveTool("select"); break;
          case "m": setActiveTool("move"); break;
          case "p": setActiveTool("pencil"); break;
          case "t": setActiveTool("text"); break;
          case "r": setActiveTool("rect"); break;
          case "o": setActiveTool("circle"); break;
          case "l": setActiveTool("line"); break;
          case "a": setActiveTool("arrow"); break;
          case "c": setActiveTool("crop"); break;
          case "h": setActiveTool("highlighter"); break;
          case "e": setActiveTool("eraser"); break;
          case "g": setShowGrid(!showGrid); break;
        }
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const objs = canvas.getActiveObjects();
        if (objs.length) {
          objs.forEach(o => canvas.remove(o));
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          setIsDirty(true);
        }
      }
      if (e.key === "Escape") {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    // Save history after modifications
    canvas.on("object:modified", () => {
      pushHistory(canvas, setCanUndo, setCanRedo);
      setIsDirty(true);
    });
    canvas.on("object:added", () => {
      pushHistory(canvas, setCanUndo, setCanRedo);
      setIsDirty(true);
    });
    canvas.on("object:removed", () => {
      pushHistory(canvas, setCanUndo, setCanRedo);
      setIsDirty(true);
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      ro.disconnect();
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // React to tool changes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = false;
    canvas.selection = activeTool === "select";
    canvas.defaultCursor = activeTool === "move" ? "grab" : "crosshair";

    if (activeTool === "pencil") {
      canvas.isDrawingMode = true;
      const brush = new fabric.PencilBrush(canvas);
      brush.width = strokeWidth;
      brush.color = strokeColor;
      canvas.freeDrawingBrush = brush;
    }
    if (activeTool === "highlighter") {
      canvas.isDrawingMode = true;
      const brush = new fabric.PencilBrush(canvas);
      brush.width = 20;
      brush.color = "rgba(255,235,59,0.45)";
      canvas.freeDrawingBrush = brush;
    }
    if (activeTool === "select") {
      canvas.defaultCursor = "default";
      canvas.getObjects().forEach(o => { o.selectable = true; o.evented = true; });
    }
    if (activeTool === "move") {
      canvas.defaultCursor = "grab";
      canvas.selection = false;
      canvas.getObjects().forEach(o => { o.selectable = false; o.evented = false; });
    }
    if (activeTool === "crop") {
      canvas.defaultCursor = "crosshair";
      canvas.selection = false;
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
  }, [activeTool, strokeColor, strokeWidth]);

  // Apply zoom
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const factor = zoom / 100;
    canvas.setZoom(factor);
    canvas.requestRenderAll();
  }, [zoom]);

  // Mouse draw handlers
  const getPointer = (e: React.MouseEvent): fabric.Point => {
    const canvas = fabricRef.current!;
    const rect = (canvas.getElement() as HTMLCanvasElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / (zoom / 100);
    const y = (e.clientY - rect.top) / (zoom / 100);
    return new fabric.Point(x, y);
  };

  const getStrokeDash = (): number[] => {
    if (borderStyle === "dashed") return [10, 5];
    if (borderStyle === "dotted") return [3, 4];
    return [];
  };

  const commonProps = () => ({
    fill: fillColor === "transparent" ? "transparent" : fillColor,
    stroke: strokeColor,
    strokeWidth,
    opacity: opacity / 100,
    strokeDashArray: getStrokeDash(),
    selectable: true,
    hasControls: true,
    objectCaching: true,
    statefullCache: false,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = fabricRef.current;
    if (!canvas || activeTool === "select") return;

    if (activeTool === "move") {
      canvas.setCursor("grabbing");
      isDrawingRef.current = true;
      originRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (activeTool === "pencil" || activeTool === "highlighter" || activeTool === "eraser") return;

    const pt = getPointer(e);
    originRef.current = { x: pt.x, y: pt.y };
    isDrawingRef.current = true;

    let shape: fabric.Object | null = null;

    if (activeTool === "crop") {
      shape = new fabric.Rect({
        left: pt.x,
        top: pt.y,
        width: 0,
        height: 0,
        fill: "rgba(0,0,0,0.3)",
        stroke: "#5BBFAD",
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        data: { type: "crop-rect" }
      });
    } else {
      switch (activeTool) {
      case "rect":
        shape = new fabric.Rect({
          ...commonProps(),
          left: pt.x, top: pt.y,
          width: 0, height: 0,
          rx: borderRadius, ry: borderRadius,
        });
        break;
      case "circle":
        shape = new fabric.Ellipse({
          ...commonProps(),
          left: pt.x, top: pt.y,
          rx: 0, ry: 0, originX: "center", originY: "center",
        });
        break;
      case "triangle":
        shape = new fabric.Triangle({
          ...commonProps(),
          left: pt.x, top: pt.y,
          width: 0, height: 0,
        });
        break;
      case "line":
        shape = new fabric.Line([pt.x, pt.y, pt.x, pt.y], {
          stroke: strokeColor,
          strokeWidth,
          opacity: opacity / 100,
          strokeDashArray: getStrokeDash(),
          selectable: true,
        });
        break;
      case "arrow": {
        // Use a Group of Line + Triangle arrowhead — avoids Fabric7 path mutation bugs
        const line = new fabric.Line([pt.x, pt.y, pt.x, pt.y], {
          stroke: strokeColor,
          strokeWidth,
          opacity: opacity / 100,
          selectable: false,
          evented: false,
        });
        const head = new fabric.Triangle({
          width: Math.max(10, strokeWidth * 4),
          height: Math.max(14, strokeWidth * 5),
          fill: strokeColor,
          opacity: opacity / 100,
          left: pt.x,
          top: pt.y,
          originX: 'center',
          originY: 'center',
          angle: 90,
          selectable: false,
          evented: false,
        });
        const group = new fabric.Group([line, head], {
          selectable: true,
        } as any);
        (group as any).data = { type: 'arrow', ox: pt.x, oy: pt.y };
        shape = group;
        break;
      }
      case "text": {
        const text = new fabric.IText("Type here…", {
          left: pt.x, top: pt.y,
          fontSize,
          fill: fillColor,
          opacity: opacity / 100,
          fontFamily: "Inter, sans-serif",
          selectable: true,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        canvas.requestRenderAll();
        isDrawingRef.current = false;
        setActiveTool("select"); // Switch back to select tool after adding text
        return;
      }
    }
  }

    if (shape) {
      canvas.add(shape);
      activeShapeRef.current = shape;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingRef.current || !activeShapeRef.current) return;
    const canvas = fabricRef.current;
    if (!canvas) return;

    const pt = getPointer(e);
    const ox = originRef.current.x;
    const oy = originRef.current.y;
    const shape = activeShapeRef.current;

    if (activeTool === "move") {
      const deltaX = e.clientX - ox;
      const deltaY = e.clientY - oy;
      canvas.relativePan(new fabric.Point(deltaX, deltaY));
      originRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!shape) return;
    const w = pt.x - ox;
    const h = pt.y - oy;

    switch (activeTool) {
      case "crop":
      case "rect":
      case "triangle":
        shape.set({
          left: w < 0 ? pt.x : ox,
          top:  h < 0 ? pt.y : oy,
          width: Math.abs(w),
          height: Math.abs(h),
        });
        break;
      case "circle":
        (shape as fabric.Ellipse).set({
          left: ox, top: oy,
          rx: Math.abs(w) / 2,
          ry: Math.abs(h) / 2,
        });
        break;
      case "line":
        (shape as fabric.Line).set({ x2: pt.x, y2: pt.y });
        break;
      case "arrow": {
        const group = shape as fabric.Group;
        const data = (group as any).data || {};
        const ox2 = data.ox ?? originRef.current.x;
        const oy2 = data.oy ?? originRef.current.y;
        const dx = pt.x - ox2;
        const dy = pt.y - oy2;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const len = Math.sqrt(dx * dx + dy * dy);

        const objects = group.getObjects();
        const line = objects[0] as fabric.Line;
        const head = objects[1] as fabric.Triangle;
        const headSize = Math.max(10, strokeWidth * 4);
        const headLen = Math.max(14, strokeWidth * 5);

        // Update line end to stop short of the tip
        const stopX = ox2 + (dx / Math.max(len, 1)) * Math.max(0, len - headLen * 0.6);
        const stopY = oy2 + (dy / Math.max(len, 1)) * Math.max(0, len - headLen * 0.6);
        line.set({ x1: ox2, y1: oy2, x2: stopX, y2: stopY });
        head.set({ left: pt.x, top: pt.y, angle: angle + 90, width: headSize, height: headLen });
        head.setCoords();
        group.set({ left: 0, top: 0 });
        break;
      }
    }
    shape.setCoords();
    canvas.requestRenderAll();
  };

  const handleMouseUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (activeTool === "move") {
      canvas.setCursor("grab");
      return;
    }

    const shape = activeShapeRef.current;
    if (shape) {
      if (activeTool === "crop") {
        const rect = shape.getBoundingRect();
        // Simple crop: resize canvas to rect and reposition objects
        // In a real app, this might be more complex, but let's do a simple version:
        // Actually, let's just use the rect for exporting or provide feedback.
        // For "ScreenshotApp", crop usually means "keep this part".
        // Let's implement actual canvas resizing:
        canvas.remove(shape);
        
        // Save current content as image to re-render it cropped? 
        // Better: shift all objects and resize canvas.
        const left = rect.left;
        const top = rect.top;
        const width = rect.width;
        const height = rect.height;

        if (width > 5 && height > 5) {
          canvas.getObjects().forEach(obj => {
            obj.left -= left;
            obj.top -= top;
            obj.setCoords();
          });
          canvas.setDimensions({ width, height });
          canvas.requestRenderAll();
          showToast("Canvas cropped!");
        }
        setActiveTool("select");
      } else {
        canvas.setActiveObject(shape);
        canvas.requestRenderAll();
      }
    }
    activeShapeRef.current = null;
  };

  // Scroll to zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      setZoom(Math.min(Math.max(useAppStore.getState().zoom + delta, 25), 400));
    }
  };

  return (
    <div
      ref={containerRef}
      className={`canvas-container ${showGrid ? 'show-grid' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      <canvas ref={canvasElRef} />

      {/* Zoom controls */}
      <div className="zoom-controls">

        <button className="zoom-btn" title="Zoom Out"
          onClick={() => setZoom(Math.max(zoom - 25, 25))}>−</button>
        <span className="zoom-level">{zoom}%</span>
        <button className="zoom-btn" title="Zoom In"
          onClick={() => setZoom(Math.min(zoom + 25, 400))}>+</button>
        <button className="zoom-btn" title="Reset Zoom" style={{ fontSize: 10, width: 36 }}
          onClick={() => setZoom(100)}>100%</button>
      </div>
    </div>
  );
}
