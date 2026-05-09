pub mod commands;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter
};

// Tauri requires a lib.rs for mobile / cdylib usage
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let take_screenshot_i = MenuItem::with_id(app, "take_screenshot", "Take Screenshot", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&take_screenshot_i, &quit_i])?;

            let mut tray_builder = TrayIconBuilder::new().menu(&menu);
            
            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let _tray = tray_builder
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "take_screenshot" => {
                            let _ = app.emit("take_screenshot", ());
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::minimize_window,
            commands::toggle_maximize,
            commands::close_window,
            commands::capture_fullscreen,
            commands::capture_region
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
