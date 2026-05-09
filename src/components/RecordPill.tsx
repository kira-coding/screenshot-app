import { useState, useRef } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { useAppStore } from "../store/appStore";

export default function RecordPill() {
  const { setIsRecordOverlay, showToast } = useAppStore();
  const [format, setFormat] = useState<"Gif" | "Video">("Gif");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [fps, setFps] = useState("30 FPS");
  const [micEnabled, setMicEnabled] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const handleClose = () => {
    if (isRecording) {
      showToast("Please stop recording before closing.", "error");
      return;
    }
    setIsRecordOverlay(false);
  };

  const startRecording = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: fps === "60 FPS" ? 60 : 30 }
      });
      
      let finalStream = displayStream;
      if (micEnabled) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          finalStream = new MediaStream([...displayStream.getTracks(), ...audioStream.getTracks()]);
        } catch (e) {
          showToast("Failed to access microphone. Recording without audio.", "error");
        }
      }
      
      streamRef.current = finalStream;
      const mimeType = 'video/webm';
      const recorder = new MediaRecorder(finalStream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const buffer = await blob.arrayBuffer();
        
        try {
          const defaultName = format === "Gif" ? "recording.gif.webm" : "recording.webm";
          const filePath = await save({
            defaultPath: defaultName,
            filters: [{
              name: 'Video',
              extensions: ['webm']
            }]
          });

          if (filePath) {
            await writeFile(filePath, new Uint8Array(buffer));
            showToast("Recording saved successfully!");
          } else {
            showToast("Save cancelled.", "info");
          }
        } catch (err) {
          console.error(err);
          showToast("Failed to save recording.", "error");
        }
        
        streamRef.current?.getTracks().forEach(t => t.stop());
        setIsRecording(false);
      };

      recorder.start(1000); // 1 second chunks
      setIsRecording(true);
      showToast("Recording started...");

      // Stop recording if user clicks "Stop Sharing" on browser level
      displayStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };
    } catch (e) {
      console.error(e);
      showToast("Failed to start recording. Ensure permissions are granted.", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="record-pill-container">
      <div className="record-pill">
        <div className="drag-handle">
          <DragIcon />
        </div>
        
        <div className="record-mode-label" style={{ cursor: 'pointer' }} onClick={() => setFormat(format === "Gif" ? "Video" : "Gif")} title="Toggle Mode">
          {format}
        </div>

        <div className="record-dropdown-wrapper">
          <select 
            value={aspectRatio} 
            onChange={(e) => setAspectRatio(e.target.value)}
            className="record-dropdown"
            disabled={isRecording}
          >
            <option value="1:1">1:1</option>
            <option value="16:9">16:9</option>
            <option value="Free">Free</option>
          </select>
          <ChevronDownIcon />
        </div>

        <div className="record-dropdown-wrapper">
          <select 
            value={fps} 
            onChange={(e) => setFps(e.target.value)}
            className="record-dropdown"
            disabled={isRecording}
          >
            <option value="30 FPS">30 FPS</option>
            <option value="60 FPS">60 FPS</option>
          </select>
          <ChevronDownIcon />
        </div>

        <button 
          className={`record-icon-btn ${micEnabled ? "active" : ""}`} 
          onClick={() => setMicEnabled(!micEnabled)}
          title={micEnabled ? "Disable Microphone" : "Enable Microphone"}
          disabled={isRecording}
        >
          {micEnabled ? <MicOnIcon /> : <MicOffIcon />}
        </button>

        <button 
          className="record-action-btn" 
          onClick={handleRecordClick}
          style={isRecording ? { backgroundColor: 'var(--color-red)' } : {}}
        >
          {isRecording ? "Stop" : "Record"}
        </button>

        <button className="record-close-btn" onClick={handleClose}>
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

// Icons
function DragIcon() { return <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor"><circle cx="4" cy="4" r="1.5"/><circle cx="4" cy="8" r="1.5"/><circle cx="4" cy="12" r="1.5"/><circle cx="8" cy="4" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="12" r="1.5"/></svg>; }
function ChevronDownIcon() { return <svg className="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>; }
function MicOffIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>; }
function MicOnIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>; }
function CloseIcon() { return <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>; }
