import { CameraType, CameraView } from 'expo-camera';
import { Platform } from 'react-native';

export type CapturedPhoto = {
  uri: string;
  width: number;
  height: number;
  format: 'jpg' | 'png';
  cameraFacing: CameraType;
  zoom: number;
};

export interface CameraService {
  isAvailable(): Promise<boolean>;
  capturePhoto(camera: CameraView, facing: CameraType, zoom: number): Promise<CapturedPhoto>;
}

class ExpoCameraService implements CameraService {
  isAvailable(): Promise<boolean> {
    // Expo SDK 54 documents isAvailableAsync as a web-only check. Calling it in
    // Expo Go on Android can report that the native method is unavailable even
    // when the device has working cameras. Native availability is determined by
    // mounting CameraView and handling onCameraReady/onMountError instead.
    if (Platform.OS !== 'web') {
      return Promise.resolve(true);
    }
    return CameraView.isAvailableAsync();
  }

  async capturePhoto(camera: CameraView, facing: CameraType, zoom: number): Promise<CapturedPhoto> {
    const result = await camera.takePictureAsync({
      base64: false,
      exif: false,
      quality: 0.92,
      skipProcessing: false,
    });

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      format: result.format,
      cameraFacing: facing,
      zoom,
    };
  }
}

export const cameraService: CameraService = new ExpoCameraService();
