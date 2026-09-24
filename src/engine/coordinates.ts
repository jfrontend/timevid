import { BASE_PIXELS_PER_SECOND } from '../constants/initialData';

export function timeToPixel(time: number, zoom: number): number {
  return time * BASE_PIXELS_PER_SECOND * zoom;
}

export function pixelToTime(pixels: number, zoom: number): number {
  return pixels / (BASE_PIXELS_PER_SECOND * zoom);
}

export function formatTimecode(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 100);

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  const ms = String(millis).padStart(2, '0');
  return `${mm}:${ss}.${ms}`;
}

export function formatSeconds(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  return `${seconds.toFixed(2)}s`;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function getSnapThresholdInTime(zoom: number, thresholdPx = 10): number {
  return thresholdPx / (BASE_PIXELS_PER_SECOND * zoom);
}
