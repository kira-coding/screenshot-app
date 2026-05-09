import { useState, useEffect } from "react";
import { enable, disable } from "@tauri-apps/plugin-autostart";
import { Store } from "@tauri-apps/plugin-store";
import { useAppStore } from "../store/appStore";

export default function SettingsModal() {
  const { 
    isSettingsOpen, 
    setIsSettingsOpen, 
    autoStart, 
    setAutoStart, 
    globalShortcut, 
    setGlobalShortcut,
    showToast
  } = useAppStore();

  const [shortcutRecording, setShortcutRecording] = useState(false);
  const [tempShortcut, setTempShortcut] = useState(globalShortcut);

  useEffect(() => {
    if (isSettingsOpen) {
      setTempShortcut(globalShortcut);
    }
  }, [isSettingsOpen, globalShortcut]);

  if (!isSettingsOpen) return null;

  const handleToggleAutoStart = async () => {
    try {
      const newValue = !autoStart;
      if (newValue) {
        await enable();
      } else {
        await disable();
      }
      setAutoStart(newValue);
      showToast(`Auto-start ${newValue ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error("Failed to toggle auto-start:", err);
      showToast("Failed to toggle auto-start", "error");
    }
  };

  const saveShortcutToStore = async (shortcut: string) => {
    try {
      const store = await Store.load('settings.json');
      await store.set('globalShortcut', { value: shortcut });
      await store.save();
      setGlobalShortcut(shortcut);
      showToast("Shortcut updated successfully");
    } catch (err) {
      console.error("Failed to save shortcut:", err);
      showToast("Failed to save shortcut", "error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!shortcutRecording) return;
    
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setShortcutRecording(false);
      setTempShortcut(globalShortcut);
      return;
    }

    // Ignore isolated modifier keys
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
      return;
    }

    const modifiers = [];
    if (e.metaKey) modifiers.push('Command');
    else if (e.ctrlKey) modifiers.push('Control');
    
    if (e.shiftKey) modifiers.push('Shift');
    if (e.altKey) modifiers.push('Alt');

    const key = e.key.toUpperCase();
    
    // Convert Space to Space key
    let displayKey = key;
    if (key === ' ') displayKey = 'Space';

    const newShortcut = [...modifiers, displayKey].join('+');
    setTempShortcut(newShortcut);
    setShortcutRecording(false);
    saveShortcutToStore(newShortcut);
  };

  return (
    <div className="settings-overlay" onClick={() => setIsSettingsOpen(false)}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={() => setIsSettingsOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="settings-content">
          <div className="setting-row">
            <div className="setting-info">
              <h3>Auto-Start</h3>
              <p>Launch ScreenshotApp on system startup</p>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={autoStart} onChange={handleToggleAutoStart} />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <h3>Global Shortcut</h3>
              <p>Shortcut to open the capture tool from anywhere</p>
            </div>
            <div 
              className={`shortcut-recorder ${shortcutRecording ? 'recording' : ''}`}
              onClick={() => setShortcutRecording(true)}
              onKeyDown={handleKeyDown}
              tabIndex={0}
            >
              {shortcutRecording ? "Press shortcut... (Esc to cancel)" : tempShortcut}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
