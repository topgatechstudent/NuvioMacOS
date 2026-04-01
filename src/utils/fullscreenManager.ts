import { NativeModules, NativeEventEmitter, Platform, Dimensions } from 'react-native';

const { FullscreenManager } = NativeModules;

const isMacCatalyst = Platform.OS === 'ios' && (() => {
  const { width, height } = Dimensions.get('screen');
  return (Platform as any).isPad === true || width > 1000 || height > 1000;
})();

const emitter = FullscreenManager ? new NativeEventEmitter(FullscreenManager) : null;

export const fullscreenManager = {
  setupTransparentTitlebar: () => {
    if (isMacCatalyst && FullscreenManager) {
      FullscreenManager.setupTransparentTitlebar();
    }
  },

  toggleFullscreen: () => {
    if (isMacCatalyst && FullscreenManager) {
      FullscreenManager.toggleFullscreen();
    }
  },

  isFullscreen: async (): Promise<boolean> => {
    if (isMacCatalyst && FullscreenManager) {
      return FullscreenManager.isFullscreen();
    }
    return false;
  },

  setToolbarVisible: (visible: boolean) => {
    if (isMacCatalyst && FullscreenManager) {
      FullscreenManager.setToolbarVisible(visible);
    }
  },

  setCursorVisible: (visible: boolean) => {
    if (isMacCatalyst && FullscreenManager) {
      FullscreenManager.setCursorVisible(visible);
    }
  },

  /** Start native mouse movement monitoring — emits 'onMouseMove' events */
  startMouseMonitor: () => {
    if (isMacCatalyst && FullscreenManager) {
      FullscreenManager.startMouseMonitor();
    }
  },

  stopMouseMonitor: () => {
    if (isMacCatalyst && FullscreenManager) {
      FullscreenManager.stopMouseMonitor();
    }
  },

  startKeyMonitor: () => {
    if (isMacCatalyst && FullscreenManager) {
      FullscreenManager.startKeyMonitor();
    }
  },

  stopKeyMonitor: () => {
    if (isMacCatalyst && FullscreenManager) {
      FullscreenManager.stopKeyMonitor();
    }
  },

  /** Subscribe to native mouse move events. Returns unsubscribe function. */
  onMouseMove: (callback: (coords: { x: number; y: number }) => void): (() => void) => {
    if (!emitter) return () => {};
    const subscription = emitter.addListener('onMouseMove', (event: any) => {
      callback({ x: event?.x ?? 0, y: event?.y ?? 0 });
    });
    return () => subscription.remove();
  },

  /** Subscribe to spacebar press events. Returns unsubscribe function. */
  onSpaceBar: (callback: () => void): (() => void) => {
    if (!emitter) return () => {};
    const subscription = emitter.addListener('onSpaceBar', callback);
    return () => subscription.remove();
  },

  /** Subscribe to arrow key press events. Returns unsubscribe function. */
  onKeyPress: (callback: (key: string) => void): (() => void) => {
    if (!emitter) return () => {};
    const subscription = emitter.addListener('onKeyPress', (event: any) => {
      callback(event?.key ?? '');
    });
    return () => subscription.remove();
  },

  /** Enable pointer (hand) cursor on interactive elements */
  enablePointerCursors: () => {
    if (isMacCatalyst && FullscreenManager) {
      FullscreenManager.enablePointerCursors();
    }
  },

  isMacCatalyst,
};
