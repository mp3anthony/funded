"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import Dialog, { DialogButton } from "@/components/ui/Dialog";
import IconCircle from "@/components/ui/IconCircle";

interface AvatarCropModalProps {
  /** Object URL of the picked file. */
  imageSrc: string;
  onCancel: () => void;
  onComplete: (blob: Blob) => void;
}

const OUTPUT_SIZE = 512; // px, square JPEG output
const JPEG_QUALITY = 0.85;
const JPEG_QUALITY_FALLBACK = 0.7;
const BLOB_SIZE_CEILING = 1.5 * 1024 * 1024; // re-encode guard (~1.5MB)
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
// Cap the source dimension we decode at crop time so we never hold a huge bitmap.
const MAX_SOURCE_DIM = 1600;

/** Wrap canvas.toBlob in a promise. */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export default function AvatarCropModal({
  imageSrc,
  onCancel,
  onComplete,
}: AvatarCropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewportSize, setViewportSize] = useState(0);

  // Mutable interaction state (kept out of React render for smooth panning).
  const t = useRef({
    natW: 0,
    natH: 0,
    coverScale: 1, // natural -> cover-fit display scale at zoom 1
    zoom: 1,
    ox: 0, // display top-left offset relative to viewport top-left
    oy: 0,
    V: 0, // viewport side in px
  });

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{
    startDist: number;
    startZoom: number;
    imgFocalX: number;
    imgFocalY: number;
  } | null>(null);

  // Scroll lock + Escape are handled by the shared <Dialog> shell.

  // ----- Measure the (responsive) square crop viewport -----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const side = el.getBoundingClientRect().width;
      t.current.V = side;
      setViewportSize(side);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clampOffsets = useCallback(() => {
    const s = t.current;
    const dispW = s.natW * s.coverScale * s.zoom;
    const dispH = s.natH * s.coverScale * s.zoom;
    // Image must always cover the viewport: top-left offset in [V - disp, 0].
    const minOx = Math.min(0, s.V - dispW);
    const minOy = Math.min(0, s.V - dispH);
    s.ox = Math.min(0, Math.max(minOx, s.ox));
    s.oy = Math.min(0, Math.max(minOy, s.oy));
  }, []);

  const applyTransform = useCallback(() => {
    const s = t.current;
    const img = imgRef.current;
    if (!img) return;
    img.style.transform = `translate(${s.ox}px, ${s.oy}px) scale(${s.zoom})`;
  }, []);

  // ----- Initialise geometry once both the image and viewport are known -----
  const initGeometry = useCallback(() => {
    const s = t.current;
    if (!s.natW || !s.natH || !s.V) return;
    s.coverScale = Math.max(s.V / s.natW, s.V / s.natH);
    s.zoom = 1;
    const coverW = s.natW * s.coverScale;
    const coverH = s.natH * s.coverScale;
    // Centre the cover-fit image.
    s.ox = (s.V - coverW) / 2;
    s.oy = (s.V - coverH) / 2;

    const img = imgRef.current;
    if (img) {
      img.style.width = `${coverW}px`;
      img.style.height = `${coverH}px`;
    }
    clampOffsets();
    applyTransform();
  }, [clampOffsets, applyTransform]);

  const onImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    t.current.natW = img.naturalWidth;
    t.current.natH = img.naturalHeight;
    initGeometry();
    setLoading(false);
  }, [initGeometry]);

  // Re-initialise when viewport size changes (e.g. rotation).
  useEffect(() => {
    if (viewportSize > 0 && t.current.natW > 0) {
      initGeometry();
    }
  }, [viewportSize, initGeometry]);

  // ----- Zoom about a focal point (viewport-local coords) -----
  const zoomTo = useCallback(
    (nextZoom: number, focalX: number, focalY: number) => {
      const s = t.current;
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
      if (clamped === s.zoom) return;
      // Keep the image point under the focal point fixed.
      const imgX = (focalX - s.ox) / s.zoom;
      const imgY = (focalY - s.oy) / s.zoom;
      s.zoom = clamped;
      s.ox = focalX - imgX * clamped;
      s.oy = focalY - imgY * clamped;
      clampOffsets();
      applyTransform();
    },
    [clampOffsets, applyTransform]
  );

  const getLocal = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  // ----- Wheel zoom (native listener so we can preventDefault) -----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x, y } = getLocal(e.clientX, e.clientY);
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      zoomTo(t.current.zoom * factor, x, y);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [getLocal, zoomTo]);

  // ----- Pointer pan + pinch -----
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const midClientX = (pts[0].x + pts[1].x) / 2;
      const midClientY = (pts[0].y + pts[1].y) / 2;
      const mid = getLocal(midClientX, midClientY);
      const s = t.current;
      pinch.current = {
        startDist: Math.hypot(dx, dy) || 1,
        startZoom: s.zoom,
        imgFocalX: (mid.x - s.ox) / s.zoom,
        imgFocalY: (mid.y - s.oy) / s.zoom,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinch.current) {
      const pts = Array.from(pointers.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const dist = Math.hypot(dx, dy) || 1;
      const midClientX = (pts[0].x + pts[1].x) / 2;
      const midClientY = (pts[0].y + pts[1].y) / 2;
      const mid = getLocal(midClientX, midClientY);
      const s = t.current;
      const nextZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, pinch.current.startZoom * (dist / pinch.current.startDist))
      );
      s.zoom = nextZoom;
      s.ox = mid.x - pinch.current.imgFocalX * nextZoom;
      s.oy = mid.y - pinch.current.imgFocalY * nextZoom;
      clampOffsets();
      applyTransform();
      return;
    }

    // Single-pointer pan.
    const s = t.current;
    s.ox += e.clientX - prev.x;
    s.oy += e.clientY - prev.y;
    clampOffsets();
    applyTransform();
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      pinch.current = null;
    }
  };

  // ----- Build the downscaled source used for the final crop -----
  const buildCropSource = useCallback(async (): Promise<{
    source: CanvasImageSource;
    srcW: number;
    srcH: number;
    bitmap: ImageBitmap | null;
  }> => {
    const s = t.current;
    const largest = Math.max(s.natW, s.natH);
    const needsDownscale = largest > MAX_SOURCE_DIM;
    const targetW = needsDownscale
      ? Math.round((s.natW * MAX_SOURCE_DIM) / largest)
      : s.natW;
    const targetH = needsDownscale
      ? Math.round((s.natH * MAX_SOURCE_DIM) / largest)
      : s.natH;

    if (typeof createImageBitmap === "function") {
      try {
        const blob = await fetch(imageSrc).then((r) => r.blob());
        const opts = needsDownscale
          ? ({
              resizeWidth: targetW,
              resizeHeight: targetH,
              resizeQuality: "high",
            } as ImageBitmapOptions)
          : undefined;
        const bitmap = await createImageBitmap(blob, opts);
        return { source: bitmap, srcW: bitmap.width, srcH: bitmap.height, bitmap };
      } catch {
        // Fall through to the <img> path below.
      }
    }

    const img = imgRef.current;
    if (!img) throw new Error("Image unavailable.");
    return { source: img, srcW: s.natW, srcH: s.natH, bitmap: null };
  }, [imageSrc]);

  const handleConfirm = useCallback(async () => {
    if (loading || processing) return;
    setProcessing(true);
    setError(null);
    let bitmap: ImageBitmap | null = null;
    try {
      const s = t.current;
      const { source, srcW, srcH, bitmap: bmp } = await buildCropSource();
      bitmap = bmp;

      // Map the square viewport region into source-image pixels.
      const dispW = s.natW * s.coverScale * s.zoom;
      const dispH = s.natH * s.coverScale * s.zoom;
      const ratioX = srcW / dispW;
      const ratioY = srcH / dispH;
      let sx = -s.ox * ratioX;
      let sy = -s.oy * ratioY;
      const sw = s.V * ratioX;
      const sh = s.V * ratioY;
      sx = Math.min(Math.max(0, sx), Math.max(0, srcW - sw));
      sy = Math.min(Math.max(0, sy), Math.max(0, srcH - sh));

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported.");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      let blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
      if (!blob) throw new Error("Could not process the image.");
      if (blob.size > BLOB_SIZE_CEILING) {
        const smaller = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY_FALLBACK);
        if (smaller) blob = smaller;
      }
      onComplete(blob);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not process the image.";
      setError(message);
      setProcessing(false);
    } finally {
      bitmap?.close();
    }
  }, [loading, processing, buildCropSource, onComplete]);

  return (
    <Dialog
      open={true}
      onClose={onCancel}
      title="Adjust photo"
      maxWidthClass="max-w-sm"
      busy={processing}
      error={error}
      footer={
        <>
          <DialogButton
            variant="ghost"
            type="button"
            onClick={onCancel}
            disabled={processing}
          >
            Cancel
          </DialogButton>
          <DialogButton
            variant="primary"
            type="button"
            onClick={handleConfirm}
            disabled={loading || processing}
          >
            {processing ? "Processing…" : error ? "Try again" : "Save photo"}
          </DialogButton>
        </>
      }
    >
      {/* Body */}
      <div className="space-y-4">
          {/* Crop viewport (square) */}
          <div
            ref={containerRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onPointerLeave={endPointer}
            className="relative w-full aspect-square rounded-card overflow-hidden bg-background border border-border select-none touch-none cursor-grab active:cursor-grabbing"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={onImgLoad}
              draggable={false}
              className="absolute left-0 top-0 max-w-none origin-top-left pointer-events-none"
              style={{ willChange: "transform" }}
            />

            {/* Circular mask overlay (avatars render as circles). */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                borderRadius: "9999px",
                margin: "6%",
              }}
            />
            <div className="pointer-events-none absolute inset-0 rounded-card ring-1 ring-white/10" />

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-3">
            <IconCircle
              label="Zoom out"
              onClick={() =>
                zoomTo(t.current.zoom / 1.25, t.current.V / 2, t.current.V / 2)
              }
              disabled={loading}
            >
              <ZoomOut size={18} />
            </IconCircle>
            <p className="text-[10px] text-muted font-body text-center flex-1">
              Drag to reposition, pinch or scroll to zoom.
            </p>
            <IconCircle
              label="Zoom in"
              onClick={() =>
                zoomTo(t.current.zoom * 1.25, t.current.V / 2, t.current.V / 2)
              }
              disabled={loading}
            >
              <ZoomIn size={18} />
            </IconCircle>
          </div>
      </div>
    </Dialog>
  );
}
