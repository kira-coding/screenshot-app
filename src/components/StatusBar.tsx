import { useAppStore } from "../store/appStore";

export default function StatusBar() {
  const { zoom, appMode, fileName, isDirty, showGrid } = useAppStore();
  return (
    <div className="statusbar">
      <span className="statusbar-item">
        <span>{appMode === "screenshot" ? "📷" : "🖊"}</span>
        {appMode === "screenshot" ? "Screenshot" : "Whiteboard"}
      </span>
      <span className="statusbar-sep">|</span>
      <span className="statusbar-item">
        {fileName}{isDirty ? " ●" : ""}
      </span>
      <span className="statusbar-sep">|</span>
      <span className="statusbar-item">🔍 {zoom}%</span>
      <span className="statusbar-sep">|</span>
      <span 
        className="statusbar-item" 
        style={{ cursor: "pointer", opacity: showGrid ? 1 : 0.5 }} 
        onClick={() => useAppStore.getState().setShowGrid(!showGrid)}
        title="Toggle Grid"
      >
        # Grid
      </span>
      <div style={{ flex: 1 }} />
      <span className="statusbar-item">ScreenshotApp v2.0</span>
    </div>
  );
}
