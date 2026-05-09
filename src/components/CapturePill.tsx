import { useAppStore } from "../store/appStore";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface Props {
  onCapture: (base64: string) => void;
}

export default function CapturePill({ onCapture }: Props) {
  const { setIsCaptureOverlay, setAppMode, showToast } = useAppStore();

  const handleCaptureFullscreen = async () => {
    try {
      const b64 = await invoke<string>("capture_fullscreen");
      onCapture(b64);
      setIsCaptureOverlay(false);
    } catch (e) {
      showToast(`Capture failed: ${e}`, "error");
    }
  };

  const handleCaptureRegion = async () => {
    try {
      // Typically an interactive selection overlay would happen here.
      // For now we use the backend stub or trigger standard region capture.
      const b64 = await invoke<string>("capture_region", { x: 100, y: 100, width: 800, height: 600 });
      onCapture(b64);
      setIsCaptureOverlay(false);
    } catch (e) {
      showToast(`Capture failed: ${e}`, "error");
    }
  };

  const handleOpenCanvas = () => {
    setAppMode("whiteboard");
    setIsCaptureOverlay(false);
  };

  const handleColorPicker = async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        // Copy to clipboard
        await navigator.clipboard.writeText(result.sRGBHex);
        showToast(`Copied ${result.sRGBHex} to clipboard!`);
      } catch (e) {
        // User canceled or error
      }
    } else {
      showToast("Color picker not supported in this environment.", "error");
    }
  };

  const handleClose = async () => {
    setIsCaptureOverlay(false);
    const win = getCurrentWindow();
    await win.minimize();
  };

  return (
    <div className="capture-pill-container">
      <div className="capture-pill">
        <button className="pill-btn" title="Share" onClick={() => showToast("Share coming soon!")}>
          <ShareIcon />
        </button>
        <button className="pill-btn" title="Fullscreen Capture" onClick={handleCaptureFullscreen}>
          <MonitorIcon />
        </button>
        <button className="pill-btn" title="Region Capture" onClick={handleCaptureRegion}>
          <RegionIcon />
        </button>
        <button className="pill-btn" title="Open Canvas" onClick={handleOpenCanvas}>
          <CanvasIcon />
        </button>
        <button className="pill-btn" title="Record GIF" onClick={() => showToast("GIF recording coming soon!")}>
          <GifIcon />
        </button>
        <button className="pill-btn" title="Record Video" onClick={() => showToast("Video recording coming soon!")}>
          <VideoIcon />
        </button>
        <button className="pill-btn" title="Save" onClick={() => showToast("Save coming soon!")}>
          <SaveIcon />
        </button>
        <button className="pill-btn" title="Color Picker" onClick={handleColorPicker}>
          <EyedropperIcon />
        </button>
        <button className="pill-btn close-btn" title="Close" onClick={handleClose}>
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

// Icons
function ShareIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>; }
function MonitorIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>; }
function RegionIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h4v2H5v2H3V3zm14 0h4v4h-2V5h-2V3zm4 14h-4v2h2v2h2v-4zM3 17h4v4H3v-4z"/></svg>; }
function CanvasIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v12H4z"/><path d="M9 16v4"/><path d="M15 16v4"/><path d="M6 20h12"/></svg>; }
function GifIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M10 12v4M14 12h-4"/></svg>; }
function VideoIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>; }
function SaveIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>; }
function EyedropperIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>; }
function CloseIcon() { return <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>; }
