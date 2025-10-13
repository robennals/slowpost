'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './ProfilePhotoEditor.module.css';

const DISPLAY_SIZE = 320;
const OUTPUT_SIZE = 512;

interface ProfilePhotoEditorProps {
  imageSrc: string;
  onCancel: () => void;
  onSave: (result: { dataUrl: string; mimeType: string }) => void;
  saving?: boolean;
  errorMessage?: string | null;
}

interface Offset {
  x: number;
  y: number;
}

export function ProfilePhotoEditor({ imageSrc, onCancel, onSave, saving, errorMessage }: ProfilePhotoEditorProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [maxScale, setMaxScale] = useState(3);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const dragState = useRef<{ isDragging: boolean; startX: number; startY: number; origin: Offset }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    origin: { x: 0, y: 0 },
  });
  const [loadingImage, setLoadingImage] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingImage(true);
    setLoadError(null);
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
      const { naturalWidth, naturalHeight } = img;
      const min = Math.max(DISPLAY_SIZE / naturalWidth, DISPLAY_SIZE / naturalHeight);
      setMinScale(min);
      setMaxScale(min * 3);
      setScale(min);
      setImageSize({ width: naturalWidth, height: naturalHeight });
      const initialOffset: Offset = {
        x: (DISPLAY_SIZE - naturalWidth * min) / 2,
        y: (DISPLAY_SIZE - naturalHeight * min) / 2,
      };
      setOffset(initialOffset);
      setLoadingImage(false);
    };
    img.onerror = () => {
      setLoadError('Failed to load image. Please try another file.');
      setLoadingImage(false);
    };

    return () => {
      imageRef.current = null;
    };
  }, [imageSrc]);

  const clampOffset = (value: number, dimension: number, currentScale: number) => {
    const scaled = dimension * currentScale;
    if (scaled <= DISPLAY_SIZE) {
      return (DISPLAY_SIZE - scaled) / 2;
    }
    const min = DISPLAY_SIZE - scaled;
    const max = 0;
    return Math.min(max, Math.max(min, value));
  };

  useEffect(() => {
    if (!imageSize) return;
    setOffset((current) => ({
      x: clampOffset(current.x, imageSize.width, scale),
      y: clampOffset(current.y, imageSize.height, scale),
    }));
  }, [scale, imageSize]);

  useEffect(() => {
    if (!imageSize || !imageRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const context = canvas.getContext('2d');
    if (!context) return;

    const sx = Math.max(0, Math.min(imageSize.width, -offset.x / scale));
    const sy = Math.max(0, Math.min(imageSize.height, -offset.y / scale));
    const sWidth = Math.min(imageSize.width - sx, DISPLAY_SIZE / scale);
    const sHeight = Math.min(imageSize.height - sy, DISPLAY_SIZE / scale);

    context.drawImage(imageRef.current, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
    setPreviewUrl(canvas.toDataURL('image/jpeg', 0.92));
  }, [offset, scale, imageSize]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!imageSize) return;
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    dragState.current = {
      isDragging: true,
      startX: event.clientX,
      startY: event.clientY,
      origin: offset,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.isDragging || !imageSize) return;
    const deltaX = event.clientX - dragState.current.startX;
    const deltaY = event.clientY - dragState.current.startY;
    const newX = clampOffset(dragState.current.origin.x + deltaX, imageSize.width, scale);
    const newY = clampOffset(dragState.current.origin.y + deltaY, imageSize.height, scale);
    setOffset({ x: newX, y: newY });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current.isDragging) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragState.current.isDragging = false;
  };

  const handleSave = () => {
    if (!imageSize || !imageRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext('2d');
    if (!context) return;

    const sx = Math.max(0, Math.min(imageSize.width, -offset.x / scale));
    const sy = Math.max(0, Math.min(imageSize.height, -offset.y / scale));
    const sWidth = Math.min(imageSize.width - sx, DISPLAY_SIZE / scale);
    const sHeight = Math.min(imageSize.height - sy, DISPLAY_SIZE / scale);

    context.drawImage(imageRef.current, sx, sy, sWidth, sHeight, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onSave({ dataUrl, mimeType: 'image/jpeg' });
  };

  const zoomLabel = useMemo(() => {
    if (!imageSize) return '';
    const ratio = scale / minScale;
    return `Zoom ${ratio.toFixed(2)}×`;
  }, [scale, minScale, imageSize]);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.dialog}>
        <h2 className={styles.title}>Adjust profile photo</h2>
        <p className={styles.instructions}>
          Drag the image to reposition it and use the zoom slider to select the part of the photo you want to use.
        </p>

        {loadError ? (
          <div className={styles.error}>{loadError}</div>
        ) : loadingImage || !imageSize ? (
          <div className={styles.loading}>Loading image…</div>
        ) : (
          <>
            <div
              className={styles.cropAreaWrapper}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              <div className={styles.cropArea}>
                <img
                  src={imageSrc}
                  alt="Profile photo editor"
                  className={styles.cropImage}
                  draggable={false}
                  style={{
                    width: imageSize.width * scale,
                    height: imageSize.height * scale,
                    transform: `translate(${offset.x}px, ${offset.y}px)`,
                  }}
                />
              </div>
            </div>

            <div className={styles.sliderRow}>
              <span className={styles.sliderLabel}>{zoomLabel}</span>
              <input
                type="range"
                min={minScale}
                max={maxScale}
                step={0.01}
                value={scale}
                onChange={(event) => setScale(parseFloat(event.target.value))}
                className={styles.slider}
              />
            </div>

            <div className={styles.previewRow}>
              <div className={styles.preview}>
                {previewUrl ? <img src={previewUrl} alt="Preview" /> : null}
              </div>
            </div>
          </>
        )}

        {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}

        <div className={styles.actions}>
          <button onClick={onCancel} className={styles.cancelButton} disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} className={styles.saveButton} disabled={saving || loadError !== null || loadingImage}>
            {saving ? 'Saving…' : 'Save photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
