pub mod commands;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter
};

// Tauri requires a lib.rs for mobile / cdylib usage
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec![])))
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let take_screenshot_i = MenuItem::with_id(app, "take_screenshot", "Take Screenshot", true, None::<&str>)?;
            let open_whiteboard_i = MenuItem::with_id(app, "open_whiteboard", "Open Whiteboard", true, None::<&str>)?;
            let import_image_i = MenuItem::with_id(app, "import_image", "Import Image", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&take_screenshot_i, &open_whiteboard_i, &import_image_i, &quit_i])?;

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
                        "open_whiteboard" => {
                            let _ = app.emit("open_whiteboard", ());
                        }
                        "import_image" => {
                            let _ = app.emit("import_image", ());
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
            commands::set_always_on_top,
            commands::capture_hiding_window,
            commands::capture_fullscreen,
            commands::capture_region
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
