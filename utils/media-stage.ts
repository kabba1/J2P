import { MediaStage } from '@/types/media';

export const mediaStages: MediaStage[] = ['before', 'progress', 'after'];

export function isMediaStage(value: unknown): value is MediaStage {
  return value === 'before' || value === 'progress' || value === 'after';
}

export function stageLabel(stage: MediaStage): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

export function stageCaptureLabel(stage: MediaStage): string {
  if (stage === 'progress') return 'Add Progress Photo';
  return `Take ${stageLabel(stage)} Photo`;
}

export function getOrientation(width?: number, height?: number): 'portrait' | 'landscape' | 'square' | undefined {
  if (!width || !height) return undefined;
  const ratio = width / height;
  if (ratio > 1.05) return 'landscape';
  if (ratio < 0.95) return 'portrait';
  return 'square';
}
