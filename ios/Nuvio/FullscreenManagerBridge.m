#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(FullscreenManager, RCTEventEmitter)

RCT_EXTERN_METHOD(startMouseMonitor)
RCT_EXTERN_METHOD(stopMouseMonitor)
RCT_EXTERN_METHOD(setupTransparentTitlebar)
RCT_EXTERN_METHOD(toggleFullscreen)
RCT_EXTERN_METHOD(isFullscreen:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(setToolbarVisible:(BOOL)visible)
RCT_EXTERN_METHOD(setCursorVisible:(BOOL)visible)
RCT_EXTERN_METHOD(enablePointerCursors)
RCT_EXTERN_METHOD(startKeyMonitor)
RCT_EXTERN_METHOD(stopKeyMonitor)

@end
