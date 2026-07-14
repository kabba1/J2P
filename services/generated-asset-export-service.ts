import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';

export type SaveToPhotosResult =
  | { status: 'saved' }
  | { status: 'permission-denied'; canAskAgain: boolean }
  | { status: 'unavailable' };

export type ShareGeneratedAssetResult =
  | { status: 'shared' }
  | { status: 'unavailable' };

export interface GeneratedAssetExportService {
  isSavingAvailable(): Promise<boolean>;
  saveToPhotos(uri: string): Promise<SaveToPhotosResult>;
  isSharingAvailable(): Promise<boolean>;
  share(uri: string): Promise<ShareGeneratedAssetResult>;
  openSettings(): Promise<void>;
}

export type GeneratedAssetExportErrorCode =
  | 'invalid-uri'
  | 'operation-in-progress'
  | 'permission-failed'
  | 'save-failed'
  | 'share-failed'
  | 'settings-failed';

export class GeneratedAssetExportError extends Error {
  constructor(
    readonly code: GeneratedAssetExportErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GeneratedAssetExportError';
  }
}

type MediaLibraryAdapter = Pick<
  typeof MediaLibrary,
  'isAvailableAsync' | 'requestPermissionsAsync' | 'saveToLibraryAsync'
>;

type SharingAdapter = Pick<
  typeof Sharing,
  'isAvailableAsync' | 'shareAsync'
>;

type ExportDependencies = {
  mediaLibrary: MediaLibraryAdapter;
  sharing: SharingAdapter;
  openSettings: () => Promise<void>;
};

function requireLocalPngUri(uri: string): string {
  const trimmed = uri.trim();
  const pathWithoutQuery = trimmed.split(/[?#]/, 1)[0].toLowerCase();
  if (!trimmed.startsWith('file://') || !pathWithoutQuery.endsWith('.png')) {
    throw new GeneratedAssetExportError(
      'invalid-uri',
      'The generated PNG file is unavailable.',
    );
  }
  return trimmed;
}

export class ExpoGeneratedAssetExportService
  implements GeneratedAssetExportService {
  private saveInProgress = false;
  private shareInProgress = false;

  constructor(
    private readonly dependencies: ExportDependencies = {
      mediaLibrary: MediaLibrary,
      sharing: Sharing,
      openSettings: () => Linking.openSettings(),
    },
  ) {}

  isSavingAvailable(): Promise<boolean> {
    return this.dependencies.mediaLibrary.isAvailableAsync();
  }

  async saveToPhotos(uri: string): Promise<SaveToPhotosResult> {
    if (this.saveInProgress) {
      throw new GeneratedAssetExportError(
        'operation-in-progress',
        'This post is already being saved to Photos.',
      );
    }

    const localUri = requireLocalPngUri(uri);
    this.saveInProgress = true;
    try {
      try {
        if (!(await this.dependencies.mediaLibrary.isAvailableAsync())) {
          return { status: 'unavailable' };
        }
      } catch {
        throw new GeneratedAssetExportError(
          'save-failed',
          'Saving to Photos is unavailable right now. Please try again.',
        );
      }

      let permission: MediaLibrary.PermissionResponse;
      try {
        permission = await this.dependencies.mediaLibrary.requestPermissionsAsync(true, []);
      } catch {
        throw new GeneratedAssetExportError(
          'permission-failed',
          'Photo access could not be requested. Please try again.',
        );
      }

      if (!permission.granted) {
        return {
          status: 'permission-denied',
          canAskAgain: permission.canAskAgain,
        };
      }

      try {
        await this.dependencies.mediaLibrary.saveToLibraryAsync(localUri);
      } catch {
        throw new GeneratedAssetExportError(
          'save-failed',
          'The post could not be saved to Photos. Please try again.',
        );
      }
      return { status: 'saved' };
    } finally {
      this.saveInProgress = false;
    }
  }

  isSharingAvailable(): Promise<boolean> {
    return this.dependencies.sharing.isAvailableAsync();
  }

  async share(uri: string): Promise<ShareGeneratedAssetResult> {
    if (this.shareInProgress) {
      throw new GeneratedAssetExportError(
        'operation-in-progress',
        'This post is already being shared.',
      );
    }

    const localUri = requireLocalPngUri(uri);
    this.shareInProgress = true;
    try {
      try {
        if (!(await this.dependencies.sharing.isAvailableAsync())) {
          return { status: 'unavailable' };
        }
      } catch {
        throw new GeneratedAssetExportError(
          'share-failed',
          'Sharing is unavailable right now. Please try again.',
        );
      }

      try {
        await this.dependencies.sharing.shareAsync(localUri, {
          dialogTitle: 'Share Before & After Post',
          mimeType: 'image/png',
          UTI: 'public.png',
        });
      } catch {
        throw new GeneratedAssetExportError(
          'share-failed',
          'The post could not be shared. Please try again.',
        );
      }
      return { status: 'shared' };
    } finally {
      this.shareInProgress = false;
    }
  }

  async openSettings(): Promise<void> {
    try {
      await this.dependencies.openSettings();
    } catch {
      throw new GeneratedAssetExportError(
        'settings-failed',
        'Device Settings could not be opened.',
      );
    }
  }
}

export const generatedAssetExportService: GeneratedAssetExportService =
  new ExpoGeneratedAssetExportService();
