/**
 * WBAP — Whiteboard Application Project
 * Proprietary format for saving & re-editing infinite-canvas whiteboards.
 *
 * File structure (ZIP with .wbap extension):
 *   manifest.json   — metadata + viewport state
 *   board.json      — Fabric.js full canvas JSON (all objects)
 *   assets/         — embedded images referenced by canvas objects
 *   thumbnail.webp  — small preview
 */

import JSZip from "jszip";
import type { Canvas as FabricCanvas } from "fabric";

export const WBAP_VERSION = "2.0.0";
export const WBAP_MIME = "application/x-screenshotapp-whiteboard";
export const WBAP_EXT = ".wbap";

export interface WBAPManifest {
  version: string;
  appName: string;
  created: string;
  modified: string;
  name: string;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
  };
  objectCount: number;
  canvasColor: string;
}

/** Save whiteboard state to .wbap binary */
export async function saveWBAP(
  canvas: FabricCanvas,
  name: string,
  zoom: number = 1,
  panX: number = 0,
  panY: number = 0
): Promise<Uint8Array> {
  const zip = new JSZip();
  const assetsFolder = zip.folder("assets");

  // Serialize canvas — includes all objects with their full style data
  const canvasJson = JSON.stringify(canvas.toObject([
    "id", "name", "selectable", "evented",
    "lockMovementX", "lockMovementY", "data"
  ]));

  const manifest: WBAPManifest = {
    version: WBAP_VERSION,
    appName: "ScreenshotApp",
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    name,
    viewport: { zoom, panX, panY },
    objectCount: canvas.getObjects().length,
    canvasColor: (canvas.backgroundColor as string) ?? "#E8F0EF",
  };

  // Thumbnail
  const thumbDataUrl = canvas.toDataURL({ format: "webp", quality: 0.6, multiplier: 0.15 });
  const thumbBase64 = thumbDataUrl.split(",")[1];

  // Extract embedded image assets
  let assetIndex = 0;
  const objects = canvas.getObjects();
  for (const obj of objects) {
    if (obj.type === "image") {
      try {
        const imgEl = (obj as any).getElement?.() as HTMLImageElement | undefined;
        if (imgEl?.src?.startsWith("data:")) {
          const base64 = imgEl.src.split(",")[1];
          const ext = imgEl.src.includes("png") ? "png" : "jpg";
          assetsFolder?.file(`image_${String(assetIndex).padStart(3, "0")}.${ext}`, base64, { base64: true });
          assetIndex++;
        }
      } catch (_) { /* skip */ }
    }
  }

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("board.json", canvasJson);
  zip.file("thumbnail.webp", thumbBase64, { base64: true });

  const blob = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return blob;
}

/** Load .wbap file and restore whiteboard */
export async function loadWBAP(
  data: Uint8Array,
  canvas: FabricCanvas
): Promise<{ manifest: WBAPManifest }> {
  const zip = await JSZip.loadAsync(data);

  const manifestStr = await zip.file("manifest.json")?.async("string");
  if (!manifestStr) throw new Error("Invalid .wbap file: missing manifest");
  const manifest: WBAPManifest = JSON.parse(manifestStr);

  const boardJsonStr = await zip.file("board.json")?.async("string");
  if (!boardJsonStr) throw new Error("Invalid .wbap file: missing board data");

  // Restore whiteboard
  canvas.backgroundColor = manifest.canvasColor;
  await canvas.loadFromJSON(JSON.parse(boardJsonStr));
  canvas.setZoom(manifest.viewport.zoom);
  canvas.absolutePan({ x: manifest.viewport.panX, y: manifest.viewport.panY } as any);
  canvas.renderAll();

  return { manifest };
}
