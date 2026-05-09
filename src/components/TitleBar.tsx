import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store/appStore";

export default function TitleBar() {
  const { fileName, isDirty } = useAppStore();

  const handleMinimize = () => invoke("minimize_window").catch(() => {});
  const handleMaximize = () => invoke("toggle_maximize").catch(() => {});
  const handleClose    = () => invoke("close_window").catch(() => {});

  return (
    <div className="titlebar">
      {/* Logo + Name */}
      <div className="titlebar-logo">
        <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="18" height="18" rx="5" fill="#5BBFAD" />
          <rect x="5" y="5" width="12" height="9" rx="2" fill="white" />
          <circle cx="11" cy="16" r="2" fill="white" />
        </svg>
        <span className="titlebar-name">ScreenshotApp</span>
      </div>

      <span className="titlebar-shortcut">Default Shortcut · Ctrl + Shift + 4</span>

      {/* File name badge */}
      <div className={`file-name ${isDirty ? "unsaved" : ""}`}>
        {fileName || "Untitled"}
      </div>

      <div className="titlebar-spacer" />

      {/* Window controls */}
      <div className="titlebar-controls">
        <button className="titlebar-btn" title="Minimize" onClick={handleMinimize}>
          <svg viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="7.5" width="12" height="1.5" rx="0.75"/></svg>
        </button>
        <button className="titlebar-btn" title="Maximize" onClick={handleMaximize}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="10" height="10" rx="1.5"/>
          </svg>
        </button>
        <button className="titlebar-btn close" title="Close" onClick={handleClose}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
