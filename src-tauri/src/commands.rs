use std::io::Cursor;
use xcap::Monitor;
use base64::{Engine as _, engine::general_purpose::STANDARD};

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
    let _ = window.close();
}

/// Captures the primary monitor and returns a base64 encoded PNG string
#[tauri::command]
pub async fn capture_fullscreen() -> Result<String, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    // Get the first monitor (primary usually)
    let monitor = monitors.first().ok_or("No monitors found")?;
    
    // Capture the screen
    let image = monitor.capture_image().map_err(|e| e.to_string())?;
    
    // Encode to PNG bytes
    let mut bytes: Vec<u8> = Vec::new();
    image.write_to(&mut Cursor::new(&mut bytes), xcap::image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;
        
    // Encode to Base64
    let b64 = STANDARD.encode(&bytes);
    
    Ok(format!("data:image/png;base64,{}", b64))
}

/// Captures a specific region of the primary monitor
#[tauri::command]
pub async fn capture_region(x: u32, y: u32, width: u32, height: u32) -> Result<String, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let monitor = monitors.first().ok_or("No monitors found")?;
    
    let image = monitor.capture_image().map_err(|e| e.to_string())?;
    
    // Crop the image
    let cropped = xcap::image::imageops::crop_imm(&image, x, y, width, height).to_image();
    
    let mut bytes: Vec<u8> = Vec::new();
    cropped.write_to(&mut Cursor::new(&mut bytes), xcap::image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;
        
    let b64 = STANDARD.encode(&bytes);
    
    Ok(format!("data:image/png;base64,{}", b64))
}
