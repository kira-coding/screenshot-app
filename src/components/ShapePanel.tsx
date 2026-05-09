import { RefObject } from "react";
import type { Canvas as FabricCanvas } from "fabric";
import { useAppStore, type BorderStyle } from "../store/appStore";

interface Props { canvasRef: RefObject<FabricCanvas | null>; }

const PRESETS = ["#1A1A1A", "#FFFFFF", "#EF4444", "rainbow", "transparent"];

export default function ShapePanel({ canvasRef }: Props) {
  const {
    activeTool, setActiveTool,
    fillColor, setFillColor,
    strokeColor, setStrokeColor,
    opacity, setOpacity,
    strokeWidth, setStrokeWidth,
    borderRadius, setBorderRadius,
    borderStyle, setBorderStyle,
    setIsDirty,
  } = useAppStore();

  const applyToSelected = (props: Record<string, unknown>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set(props as any);
    canvas.requestRenderAll();
    setIsDirty(true);
  };

  const handleFill = (color: string) => {
    setFillColor(color);
    applyToSelected({ fill: color });
  };

  const handleStroke = (color: string) => {
    setStrokeColor(color);
    applyToSelected({ stroke: color });
  };

  const handleOpacity = (v: number) => {
    setOpacity(v);
    applyToSelected({ opacity: v / 100 });
  };

  const handleStrokeWidth = (v: number) => {
    setStrokeWidth(v);
    applyToSelected({ strokeWidth: v });
  };

  const handleBorderRadius = (v: number) => {
    setBorderRadius(v);
    applyToSelected({ rx: v, ry: v });
  };

  const handleBorderStyle = (s: BorderStyle) => {
    setBorderStyle(s);
    const dash = s === "dashed" ? [10, 5] : s === "dotted" ? [3, 4] : [];
    applyToSelected({ strokeDashArray: dash });
  };

  return (
    <div className="shape-panel">

      {/* Shapes */}
      <div className="panel-section">
        <div className="panel-label">Shapes</div>
        <div className="shape-picker">
          <button
            className={`shape-btn ${activeTool === "rect" ? "active" : ""}`}
            title="Rectangle" onClick={() => setActiveTool("rect")}>
            <RectSvg />
          </button>
          <button
            className={`shape-btn ${activeTool === "circle" ? "active" : ""}`}
            title="Circle" onClick={() => setActiveTool("circle")}>
            <CircleSvg />
          </button>
          <button
            className={`shape-btn ${activeTool === "triangle" ? "active" : ""}`}
            title="Triangle" onClick={() => setActiveTool("triangle")}>
            <TriSvg />
          </button>
          <button
            className={`shape-btn ${activeTool === "hexagon" ? "active" : ""}`}
            title="Hexagon" onClick={() => setActiveTool("hexagon")}>
            <HexSvg />
          </button>
        </div>
      </div>

      {/* Fill Color */}
      <div className="panel-section">
        <div className="panel-label">Color</div>
        <div className="color-picker-row">
          <ColorSwatch color="#1A1A1A" active={fillColor === "#1A1A1A"} onClick={() => handleFill("#1A1A1A")} className="black" />
          <ColorSwatch color="#FFFFFF" active={fillColor === "#FFFFFF"} onClick={() => handleFill("#FFFFFF")} className="white" />
          <ColorSwatch color="#EF4444" active={fillColor === "#EF4444"} onClick={() => handleFill("#EF4444")} className="red" />
          <div className={`color-swatch rainbow ${fillColor === "rainbow" ? "active" : ""}`}
            title="Color picker" onClick={() => {
              const inp = document.createElement("input");
              inp.type = "color"; inp.value = fillColor.startsWith("#") ? fillColor : "#5BBFAD";
              inp.oninput = (e) => handleFill((e.target as HTMLInputElement).value);
              inp.click();
            }} />
          <div className={`color-swatch transparent ${fillColor === "transparent" ? "active" : ""}`}
            title="Transparent" onClick={() => handleFill("transparent")} />
          <button className="gradient-btn" onClick={() => handleFill("linear-gradient(135deg,#F97316,#EC4899)")}>
            Gradient
          </button>
        </div>
      </div>

      {/* Opacity */}
      <div className="panel-section">
        <div className="panel-label">Opacity</div>
        <div className="slider-row">
          <input type="range" className="slider-track" min={0} max={100} value={opacity}
            style={{ "--val": `${opacity}%` } as React.CSSProperties}
            onChange={e => handleOpacity(Number(e.target.value))} />
          <span className="slider-value">{opacity} %</span>
        </div>
      </div>

      {/* Border Width */}
      <div className="panel-section">
        <div className="panel-label">Border</div>
        <div className="slider-row">
          <input type="range" className="slider-track" min={0} max={40} value={strokeWidth}
            style={{ "--val": `${(strokeWidth / 40) * 100}%` } as React.CSSProperties}
            onChange={e => handleStrokeWidth(Number(e.target.value))} />
          <span className="slider-value">{strokeWidth} px</span>
        </div>
      </div>

      {/* Border Type */}
      <div className="panel-section">
        <div className="panel-label">Border Type</div>
        <div className="border-type-row">
          <button className={`border-type-btn ${borderStyle === "solid" ? "active" : ""}`}
            onClick={() => handleBorderStyle("solid")}>
            <svg viewBox="0 0 28 4"><line x1="0" y1="2" x2="28" y2="2" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
          <button className={`border-type-btn ${borderStyle === "dashed" ? "active" : ""}`}
            onClick={() => handleBorderStyle("dashed")}>
            <svg viewBox="0 0 28 4"><line x1="0" y1="2" x2="28" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="6 3"/></svg>
          </button>
          <button className={`border-type-btn ${borderStyle === "dotted" ? "active" : ""}`}
            onClick={() => handleBorderStyle("dotted")}>
            <svg viewBox="0 0 28 4"><line x1="0" y1="2" x2="28" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="2 3"/></svg>
          </button>
        </div>
      </div>

      {/* Border Roundness */}
      <div className="panel-section">
        <div className="panel-label">Border Roundness</div>
        <div className="slider-row">
          <input type="range" className="slider-track" min={0} max={60} value={borderRadius}
            style={{ "--val": `${(borderRadius / 60) * 100}%` } as React.CSSProperties}
            onChange={e => handleBorderRadius(Number(e.target.value))} />
          <span className="slider-value">{borderRadius} px</span>
        </div>
      </div>

      {/* Border Color */}
      <div className="panel-section">
        <div className="panel-label">Border Color</div>
        <div className="color-picker-row">
          <ColorSwatch color="#1A1A1A" active={strokeColor === "#1A1A1A"} onClick={() => handleStroke("#1A1A1A")} className="black" />
          <ColorSwatch color="#FFFFFF" active={strokeColor === "#FFFFFF"} onClick={() => handleStroke("#FFFFFF")} className="white" />
          <ColorSwatch color="#EF4444" active={strokeColor === "#EF4444"} onClick={() => handleStroke("#EF4444")} className="red" />
          <div className="color-swatch rainbow" title="Color picker" onClick={() => {
            const inp = document.createElement("input");
            inp.type = "color"; inp.value = strokeColor.startsWith("#") ? strokeColor : "#5BBFAD";
            inp.oninput = (e) => handleStroke((e.target as HTMLInputElement).value);
            inp.click();
          }} />
          <div className="color-swatch transparent" title="No border"
            onClick={() => handleStroke("transparent")} />
          <button className="gradient-btn" onClick={() => handleStroke("#F97316")}>
            Gradient
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Shape Icons ---- */
function ColorSwatch({ color, active, onClick, className }: {
  color: string; active: boolean; onClick: () => void; className: string;
}) {
  return (
    <div
      className={`color-swatch ${className} ${active ? "active" : ""}`}
      style={className === "" ? { background: color } : undefined}
      title={color}
      onClick={onClick}
    />
  );
}

function RectSvg() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="16" height="12" rx="2"/></svg>;
}
function CircleSvg() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7"/></svg>;
}
function TriSvg() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="10,3 18,17 2,17"/></svg>;
}
function HexSvg() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="10,2 17,6 17,14 10,18 3,14 3,6"/></svg>;
}
