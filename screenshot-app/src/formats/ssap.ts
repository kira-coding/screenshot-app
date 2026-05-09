/**
 * SSAP — Screenshot Annotation Project
 * Proprietary format for saving & re-editing annotated screenshots.
 *
 * File structure (ZIP with .ssap extension):
 *   manifest.json   — metadata
 *   canvas.json     — Fabric.js full canvas JSON (all objects)
 *   source.png      — original base image (base64 data URL stored inline)
 *   thumbnail.webp  — small preview image
 */

import JSZip from "jszip";
import type { Canvas as FabricCanvas } from "fabric";

export const SSAP_VERSION = "2.0.0";
export const SSAP_MIME = "application/x-screenshotapp-project";
export const SSAP_EXT = ".ssap";

export interface SSAPManifest {
  version: string;
  appName: string;
  created: string;
  modified: string;
  name: string;
  width: number;
  height: number;
  objectCount: number;
}

/** Save canvas + source image to .ssap binary (Uint8Array) */
export async function saveSSAP(
  canvas: FabricCanvas,
  name: string,
  sourceDataUrl?: string
): Promise<Uint8Array> {
  const zip = new JSZip();

  // 1. Serialize canvas
  const canvasJson = JSON.stringify(canvas.toObject([
    "id", "name", "selectable", "evented", "lockMovementX", "lockMovementY"
  ]));

  // 2. Manifest
  const manifest: SSAPManifest = {
    version: SSAP_VERSION,
    appName: "ScreenshotApp",
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    name,
    width: canvas.width ?? 1920,
    height: canvas.height ?? 1080,
    objectCount: canvas.getObjects().length,
  };

  // 3. Thumbnail (200x150)
  const thumbDataUrl = canvas.toDataURL({ format: "webp", quality: 0.6, multiplier: 0.2 });
  const thumbBase64 = thumbDataUrl.split(",")[1];

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("canvas.json", canvasJson);
  if (sourceDataUrl) {
    const srcBase64 = sourceDataUrl.split(",")[1];
    zip.file("source.png", srcBase64, { base64: true });
  }
  zip.file("thumbnail.webp", thumbBase64, { base64: true });

  const blob = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return blob;
}

/** Load .ssap file and restore canvas */
export async function loadSSAP(
  data: Uint8Array,
  canvas: FabricCanvas
): Promise<{ manifest: SSAPManifest; sourceDataUrl?: string }> {
  const zip = await JSZip.loadAsync(data);

  const manifestStr = await zip.file("manifest.json")?.async("string");
  if (!manifestStr) throw new Error("Invalid .ssap file: missing manifest");
  const manifest: SSAPManifest = JSON.parse(manifestStr);

  const canvasJsonStr = await zip.file("canvas.json")?.async("string");
  if (!canvasJsonStr) throw new Error("Invalid .ssap file: missing canvas data");

  // Restore canvas
  await canvas.loadFromJSON(JSON.parse(canvasJsonStr));
  canvas.renderAll();

  // Restore source image if present
  let sourceDataUrl: string | undefined;
  const srcFile = zip.file("source.png");
  if (srcFile) {
    const srcBase64 = await srcFile.async("base64");
    sourceDataUrl = `data:image/png;base64,${srcBase64}`;
  }

  return { manifest, sourceDataUrl };
}
