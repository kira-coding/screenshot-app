use std::io::Cursor;
use xcap::Monitor;
use base64::{Engine as _, engine::general_purpose::STANDARD};
use std::process::Command;
use std::fs;

#[tauri::command]
pub fn minimize_window(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
pub fn toggle_maximize(window: tauri::Window) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

#[tauri::command]
pub fn close_window(window: tauri::Window) {
    let _ = window.hide();
}

#[tauri::command]
pub fn hide_window(window: tauri::Window) {
    let _ = window.hide();
}

#[tauri::command]
pub fn set_always_on_top(window: tauri::Window, always_on_top: bool) {
    let _ = window.set_always_on_top(always_on_top);
}

/// Hides the app window, waits briefly, captures the screen, then shows the window again.
/// This ensures the app itself doesn't appear in the screenshot.
#[tauri::command]
pub async fn capture_hiding_window(window: tauri::Window) -> Result<String, String> {
    let _ = window.hide();
    // Small delay so the OS repaints the screen before we capture
    std::thread::sleep(std::time::Duration::from_millis(250));
    let result = do_capture_fullscreen();
    let _ = window.show();
    let bytes = result?;
    let b64 = STANDARD.encode(&bytes);
    Ok(format!("data:image/png;base64,{}", b64))
}

fn do_capture_fullscreen() -> Result<Vec<u8>, String> {
    // 1. Try xcap first (works on X11, Windows, macOS). Catch panic for Wayland.
    let xcap_result = std::panic::catch_unwind(|| {
        if let Ok(monitors) = Monitor::all() {
            if let Some(monitor) = monitors.first() {
                if let Ok(image) = monitor.capture_image() {
                    let mut bytes: Vec<u8> = Vec::new();
                    if image.write_to(&mut Cursor::new(&mut bytes), xcap::image::ImageFormat::Png).is_ok() {
                        return Some(bytes);
                    }
                }
            }
        }
        None
    });

    if let Ok(Some(bytes)) = xcap_result {
        return Ok(bytes);
    }

    // 2. Fallbacks for Wayland
    let path = "/tmp/screenshotapp_fallback.png";
    let _ = fs::remove_file(path);

    // KDE Plasma (Spectacle)
    let spectacle = Command::new("spectacle")
        .args(["-b", "-n", "-o", path])
        .output();
        
    if spectacle.is_ok() && fs::metadata(path).is_ok() {
        if let Ok(bytes) = fs::read(path) {
            return Ok(bytes);
        }
    }

    // Generic wlroots (Grim)
    let grim = Command::new("grim")
        .arg(path)
        .output();

    if grim.is_ok() && fs::metadata(path).is_ok() {
        if let Ok(bytes) = fs::read(path) {
            return Ok(bytes);
        }
    }

    Err("Failed to capture screen using xcap, spectacle, or grim.".to_string())
}

/// Captures the primary monitor and returns a base64 encoded PNG string
#[tauri::command]
pub async fn capture_fullscreen() -> Result<String, String> {
    let bytes = do_capture_fullscreen()?;
    let b64 = STANDARD.encode(&bytes);
    Ok(format!("data:image/png;base64,{}", b64))
}

/// Captures a specific region of the primary monitor
#[tauri::command]
pub async fn capture_region(x: u32, y: u32, width: u32, height: u32) -> Result<String, String> {
    let bytes = do_capture_fullscreen()?;
    
    // Crop the image
    let image = xcap::image::load_from_memory(&bytes).map_err(|e| e.to_string())?;
    let cropped = xcap::image::imageops::crop_imm(&image, x, y, width, height).to_image();
    
    let mut out_bytes: Vec<u8> = Vec::new();
    cropped.write_to(&mut Cursor::new(&mut out_bytes), xcap::image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;
        
    let b64 = STANDARD.encode(&out_bytes);
    Ok(format!("data:image/png;base64,{}", b64))
}
