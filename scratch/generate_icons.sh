#!/bin/bash
SRC="src-tauri/icons/download.jfif"
DEST_DIR="src-tauri/icons"

echo "Generating icons from $SRC..."

# Ensure source exists
if [ ! -f "$SRC" ]; then
    echo "Error: $SRC not found!"
    exit 1
fi

# Convert to master PNG (1024x1024 is better for icon sets)
magick "$SRC" -resize 1024x1024 "$DEST_DIR/icon.png"

# Standard sizes
magick "$DEST_DIR/icon.png" -resize 32x32 "$DEST_DIR/32x32.png"
magick "$DEST_DIR/icon.png" -resize 64x64 "$DEST_DIR/64x64.png"
magick "$DEST_DIR/icon.png" -resize 128x128 "$DEST_DIR/128x128.png"
magick "$DEST_DIR/icon.png" -resize 256x256 "$DEST_DIR/128x128@2x.png"

# Windows Store sizes
magick "$DEST_DIR/icon.png" -resize 30x30 "$DEST_DIR/Square30x30Logo.png"
magick "$DEST_DIR/icon.png" -resize 44x44 "$DEST_DIR/Square44x44Logo.png"
magick "$DEST_DIR/icon.png" -resize 71x71 "$DEST_DIR/Square71x71Logo.png"
magick "$DEST_DIR/icon.png" -resize 89x89 "$DEST_DIR/Square89x89Logo.png"
magick "$DEST_DIR/icon.png" -resize 107x107 "$DEST_DIR/Square107x107Logo.png"
magick "$DEST_DIR/icon.png" -resize 142x142 "$DEST_DIR/Square142x142Logo.png"
magick "$DEST_DIR/icon.png" -resize 150x150 "$DEST_DIR/Square150x150Logo.png"
magick "$DEST_DIR/icon.png" -resize 284x284 "$DEST_DIR/Square284x284Logo.png"
magick "$DEST_DIR/icon.png" -resize 310x310 "$DEST_DIR/Square310x310Logo.png"
magick "$DEST_DIR/icon.png" -resize 50x50 "$DEST_DIR/StoreLogo.png"

# ICO (Multi-size)
magick "$DEST_DIR/icon.png" -define icon:auto-resize=256,128,64,48,32,16 "$DEST_DIR/icon.ico"

# ICNS (Best effort with magick)
# Note: True ICNS usually requires specialized tools, but magick can sometimes create a basic one.
magick "$DEST_DIR/icon.png" "$DEST_DIR/icon.icns"

echo "All icons generated in $DEST_DIR"
