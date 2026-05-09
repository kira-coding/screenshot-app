import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store/appStore";

export default function TitleBar() {
  const { fileName, isDirty, setIsSettingsOpen } = useAppStore();

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

      {/* Left Actions */}
      <div className="titlebar-actions">
        <button className="titlebar-btn action-btn">
          <CameraIcon /> Capture <ChevronDownIcon />
        </button>
        <button className="titlebar-btn icon-only" title="Delete">
          <TrashIcon />
        </button>
      </div>

      <div className="titlebar-spacer" />

      {/* Right Actions */}
      <div className="titlebar-actions right-actions">
        <button className="titlebar-btn icon-only" title="Undo"><UndoIcon /></button>
        <button className="titlebar-btn icon-only" title="Redo"><RedoIcon /></button>
        <div className="titlebar-divider" />
        <button className="titlebar-btn icon-only" title="Copy"><CopyIcon /></button>
        <button className="titlebar-btn icon-only" title="Print"><PrintIcon /></button>
        <button className="titlebar-btn icon-only" title="Settings" onClick={() => setIsSettingsOpen(true)}><CommandIcon /></button>
        <button className="titlebar-btn icon-only" title="User"><UserIcon /></button>
        <button className="titlebar-btn icon-only" title="Wand"><WandIcon /></button>
        <button className="titlebar-btn icon-only" title="Layout"><LayoutIcon /></button>
      </div>

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

// Icons
function CameraIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>; }
function ChevronDownIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><polyline points="6 9 12 15 18 9"></polyline></svg>; }
function TrashIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>; }
function UndoIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>; }
function RedoIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>; }
function CopyIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>; }
function PrintIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>; }
function CommandIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3s0 0 0 0h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>; }
function UserIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function WandIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z"/></svg>; }
function LayoutIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>; }
