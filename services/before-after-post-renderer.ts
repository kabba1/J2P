import { Image } from 'expo-image';
import { RefObject } from 'react';
import { PixelRatio, Platform, View } from 'react-native';
import {
  captureRef,
  CaptureOptions,
} from 'react-native-view-shot';

import {
  GeneratedAssetFormat,
  GeneratedAssetLayout,
  isGeneratedAssetLayout,
} from '@/types/generated-asset';
import { getGeneratedAssetDimensions } from '@/utils/generated-asset';

export type RenderBeforeAfterPostInput = {
  assetId: string;
  jobId: string;
  pairId: string;
  beforeUri: string;
  afterUri: string;
  format: GeneratedAssetFormat;
  layout: GeneratedAssetLayout;
  labelsEnabled: boolean;
  footerText?: string;
};

export type RenderedAsset = {
  uri: string;
  width: number;
  height: number;
};

export interface BeforeAfterPostRenderer {
  render(input: RenderBeforeAfterPostInput): Promise<RenderedAsset>;
}

export type ViewShotRendererTarget = {
  ref: RefObject<View | null>;
  isReady: () => boolean;
  matchesInput?: (input: RenderBeforeAfterPostInput) => boolean;
};

export type BeforeAfterPostRenderErrorCode =
  | 'invalid-input'
  | 'not-ready'
  | 'render-in-progress'
  | 'capture-failed';

export class BeforeAfterPostRenderError extends Error {
  constructor(
    readonly code: BeforeAfterPostRenderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BeforeAfterPostRenderError';
  }
}

type CaptureView = (
  target: RefObject<View | null>,
  options: CaptureOptions,
) => Promise<string>;

type RendererDependencies = {
  captureView: CaptureView;
  getPixelRatio: () => number;
  getPlatform: () => typeof Platform.OS;
  inspectImage: (uri: string) => Promise<{ width: number; height: number }>;
  waitForPaint: () => Promise<void>;
};

const captureView: CaptureView = (target, options) => captureRef(target, options);

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function waitForPaint(): Promise<void> {
  await nextAnimationFrame();
  await nextAnimationFrame();
}

async function inspectImage(uri: string): Promise<{ width: number; height: number }> {
  const image = await Image.loadAsync(uri);
  try {
    return {
      width: Math.round(image.width * image.scale),
      height: Math.round(image.height * image.scale),
    };
  } finally {
    image.release();
  }
}

function requireValue(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new BeforeAfterPostRenderError('invalid-input', `${label} is required.`);
  }
  return trimmed;
}

function validateInput(input: RenderBeforeAfterPostInput): void {
  requireValue(input.assetId, 'Asset ID');
  requireValue(input.jobId, 'Job ID');
  requireValue(input.pairId, 'Pair ID');
  requireValue(input.beforeUri, 'Before photo URI');
  requireValue(input.afterUri, 'After photo URI');
  getGeneratedAssetDimensions(input.format);
  if (!isGeneratedAssetLayout(input.layout)) {
    throw new BeforeAfterPostRenderError(
      'invalid-input',
      'Generated post layout is invalid.',
    );
  }
  if (typeof input.labelsEnabled !== 'boolean') {
    throw new BeforeAfterPostRenderError(
      'invalid-input',
      'Generated post label setting is invalid.',
    );
  }
}

export class ViewShotBeforeAfterPostRenderer implements BeforeAfterPostRenderer {
  private captureInProgress = false;

  constructor(
    private readonly target: ViewShotRendererTarget,
    private readonly dependencies: RendererDependencies = {
      captureView,
      getPixelRatio: PixelRatio.get,
      getPlatform: () => Platform.OS,
      inspectImage,
      waitForPaint,
    },
  ) {}

  async render(input: RenderBeforeAfterPostInput): Promise<RenderedAsset> {
    if (this.captureInProgress) {
      throw new BeforeAfterPostRenderError(
        'render-in-progress',
        'A post is already being generated.',
      );
    }

    this.captureInProgress = true;
    try {
      validateInput(input);
      if (
        !this.target.ref.current ||
        !this.target.isReady() ||
        (this.target.matchesInput && !this.target.matchesInput(input))
      ) {
        throw new BeforeAfterPostRenderError(
          'not-ready',
          'The post preview changed while preparing. Please try again in a moment.',
        );
      }

      await this.dependencies.waitForPaint();

      if (
        !this.target.ref.current ||
        !this.target.isReady() ||
        (this.target.matchesInput && !this.target.matchesInput(input))
      ) {
        throw new BeforeAfterPostRenderError(
          'not-ready',
          'The post preview changed while preparing. Please try again in a moment.',
        );
      }

      const dimensions = getGeneratedAssetDimensions(input.format);
      const pixelRatio = this.dependencies.getPixelRatio();
      if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) {
        throw new BeforeAfterPostRenderError(
          'capture-failed',
          'The device display scale could not be determined.',
        );
      }

      let uri: string;
      try {
        const nativeScaleDivisor = this.dependencies.getPlatform() === 'ios'
          ? pixelRatio
          : 1;
        uri = await this.dependencies.captureView(this.target.ref, {
          format: 'png',
          result: 'tmpfile',
          quality: 1,
          width: Math.round(dimensions.width / nativeScaleDivisor),
          height: Math.round(dimensions.height / nativeScaleDivisor),
        });
      } catch {
        throw new BeforeAfterPostRenderError(
          'capture-failed',
          'The post could not be rendered. Please try again.',
        );
      }

      if (!uri.trim()) {
        throw new BeforeAfterPostRenderError(
          'capture-failed',
          'The rendered post file could not be created.',
        );
      }

      try {
        const actualDimensions = await this.dependencies.inspectImage(uri);
        return { uri, ...actualDimensions };
      } catch {
        return { uri, width: 0, height: 0 };
      }
    } finally {
      this.captureInProgress = false;
    }
  }
}

export function createBeforeAfterPostRenderer(
  target: ViewShotRendererTarget,
): BeforeAfterPostRenderer {
  return new ViewShotBeforeAfterPostRenderer(target);
}

export function getRenderDimensions(format: GeneratedAssetFormat): {
  width: number;
  height: number;
} {
  return getGeneratedAssetDimensions(format);
}
