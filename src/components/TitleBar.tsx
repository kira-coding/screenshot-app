import { useRef, useState, RefObject } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile, writeFile } from "@tauri-apps/plugin-fs";
import { useAppStore } from "../store/appStore";
import type { Canvas as FabricCanvas } from "fabric";

interface Props {
  canvasRef?: RefObject<FabricCanvas | null>;
}

export default function TitleBar({ canvasRef }: Props) {
  const { setIsSettingsOpen, setIsCaptureOverlay, canUndo, canRedo, showToast, setFileName, fileName, setIsDirty } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleMinimize = () => invoke("minimize_window").catch(() => {});
  const handleMaximize = () => invoke("toggle_maximize").catch(() => {});
  const handleClose    = () => invoke("close_window").catch(() => {});

  const handleUndo = () => {
    const canvas = canvasRef?.current;
    if ((canvas as any)?._historyUndo) (canvas as any)._historyUndo();
  };
  const handleRedo = () => {
    const canvas = canvasRef?.current;
    if ((canvas as any)?._historyRedo) (canvas as any)._historyRedo();
  };

  // ── New Whiteboard ──────────────────────────────────────────────────────
  const handleNewProject = () => {
    setMenuOpen(false);
    const canvas = canvasRef?.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#E8F0EF";
    canvas.requestRenderAll();
    setFileName("Untitled");
    setIsDirty(false);
    showToast("New whiteboard created");
  };

  // ── Save Project (.scap) ─────────────────────────────────────────────────
  const handleSaveProject = async () => {
    setMenuOpen(false);
    const canvas = canvasRef?.current;
    if (!canvas) { showToast("No canvas to save", "error"); return; }
    try {
      const filePath = await save({
        defaultPath: `${fileName || 'project'}.scap`,
        filters: [{ name: 'ScreenshotApp Project', extensions: ['scap'] }]
      });
      if (!filePath) return;
      const json = JSON.stringify({
        version: "2.0.0",
        app: "ScreenshotApp",
        created: new Date().toISOString(),
        canvas: canvas.toJSON()
      }, null, 2);
      await writeTextFile(filePath, json);
      // Extract filename for display
      const name = filePath.split(/[\\/]/).pop()?.replace('.scap', '') ?? 'project';
      setFileName(name);
      setIsDirty(false);
      showToast("Project saved!");
    } catch (e) {
      showToast(`Save failed: ${e}`, "error");
    }
  };

  // ── Open Project (.scap) ─────────────────────────────────────────────────
  const handleOpenProject = async () => {
    setMenuOpen(false);
    const canvas = canvasRef?.current;
    if (!canvas) { showToast("Canvas not ready", "error"); return; }
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'ScreenshotApp Project', extensions: ['scap'] }]
      });
      if (!selected) return;
      const raw = await readTextFile(selected as string);
      const data = JSON.parse(raw);
      if (data.app !== "ScreenshotApp") {
        showToast("Invalid .scap file", "error");
        return;
      }
      await canvas.loadFromJSON(data.canvas);
      canvas.requestRenderAll();
      const name = (selected as string).split(/[\\/]/).pop()?.replace('.scap', '') ?? 'project';
      setFileName(name);
      setIsDirty(false);
      showToast("Project opened!");
    } catch (e) {
      showToast(`Open failed: ${e}`, "error");
    }
  };

  // ── Export as PNG ────────────────────────────────────────────────────────
  const handleExportPng = async () => {
    setMenuOpen(false);
    const canvas = canvasRef?.current;
    if (!canvas) { showToast("No canvas to export", "error"); return; }
    try {
      const filePath = await save({
        defaultPath: `${fileName || 'export'}.png`,
        filters: [{ name: 'PNG Image', extensions: ['png'] }]
      });
      if (!filePath) return;
      const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
      const base64 = dataUrl.split(',')[1];
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      await writeFile(filePath, bytes);
      showToast("Exported as PNG!");
    } catch (e) {
      showToast(`Export failed: ${e}`, "error");
    }
  };

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

      {/* File menu */}
      <div className="titlebar-file-menu" style={{ position: 'relative', WebkitAppRegion: 'no-drag' } as any}>
        <button className="titlebar-menu-btn" onClick={() => setMenuOpen(o => !o)}>
          File
        </button>
        {menuOpen && (
          <div className="titlebar-dropdown" onMouseLeave={() => setMenuOpen(false)}>
            <button className="dropdown-item" onClick={handleNewProject}><PlusIcon /> New Whiteboard</button>
            <div className="dropdown-divider" />
            <button className="dropdown-item" onClick={handleOpenProject}><FolderIcon /> Open Project…</button>
            <button className="dropdown-item" onClick={handleSaveProject}><SaveIcon /> Save Project…</button>
            <div className="dropdown-divider" />
            <button className="dropdown-item" onClick={handleExportPng}><ExportIcon /> Export as PNG…</button>
          </div>
        )}
      </div>

      {/* Centered Capture button */}
      <div className="titlebar-center">
        <button
          className="titlebar-capture-btn"
          onClick={() => setIsCaptureOverlay(true)}
          title="Take Screenshot"
        >
          <CameraIcon /> Capture
        </button>
      </div>

      <div className="titlebar-spacer" />

      {/* Right Actions */}
      <div className="titlebar-actions right-actions">
        <button className="titlebar-btn icon-only" title="Undo" disabled={!canUndo} onClick={handleUndo}><UndoIcon /></button>
        <button className="titlebar-btn icon-only" title="Redo" disabled={!canRedo} onClick={handleRedo}><RedoIcon /></button>
        <div className="titlebar-divider" />
        <button className="titlebar-btn icon-only" title="Settings" onClick={() => setIsSettingsOpen(true)}><SettingsIcon /></button>
      </div>

      {/* Window controls */}
      <div className="titlebar-controls">
        <button className="titlebar-btn" title="Minimize" onClick={handleMinimize}>
          <svg viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="7.5" width="12" height="1.5" rx="0.75"/></svg>
        </button>
        <button className="titlebar-btn" title="Maximize" onClick={handleMaximize}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="10" height="10" rx="1.5"/></svg>
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

function CameraIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>; }
function UndoIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>; }
function RedoIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>; }
function SettingsIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>; }
function SaveIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>; }
function FolderIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>; }
function ExportIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function PlusIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
