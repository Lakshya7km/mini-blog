import { Geolocation } from '@capacitor/geolocation';
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export async function requestLocationPermission() {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await Geolocation.requestPermissions();
      return status.location === 'granted';
    } catch (e) {
      console.error('Location permission request failed', e);
      return false;
    }
  } else {
    // Browser
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false)
      );
    });
  }
}

export async function requestCameraPermission() {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await Camera.requestPermissions();
      return status.camera === 'granted';
    } catch (e) {
      console.error('Camera permission request failed', e);
      return false;
    }
  } else {
    // Browser
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (e) {
      console.error('Camera access denied', e);
      return false;
    }
  }
}
