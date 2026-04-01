import Foundation
import UIKit
import React

#if targetEnvironment(macCatalyst)
@objc(FullscreenManager)
class FullscreenManager: RCTEventEmitter {

  private var hoverRecognizer: UIHoverGestureRecognizer?
  private var pointerHoverRecognizer: UIHoverGestureRecognizer?
  private var hasListeners = false

  private func getNSWindow() -> AnyObject? {
    guard let nsApp = NSClassFromString("NSApplication"),
          let sharedApp = nsApp.value(forKeyPath: "sharedApplication") as? AnyObject,
          let nsWindows = sharedApp.value(forKeyPath: "windows") as? [AnyObject]
    else { return nil }

    for nsWindow in nsWindows {
      if let uiWindows = nsWindow.value(forKeyPath: "uiWindows") as? [UIWindow],
         !uiWindows.isEmpty {
        return nsWindow
      }
    }
    return nil
  }

  private func getActiveWindow() -> UIWindow? {
    let windowScenes = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .sorted { lhs, rhs in
        lhs.activationState.rawValue > rhs.activationState.rawValue
      }

    for scene in windowScenes {
      if let keyWindow = scene.windows.first(where: { $0.isKeyWindow }) {
        return keyWindow
      }
      if let firstWindow = scene.windows.first {
        return firstWindow
      }
    }

    return nil
  }

  // MARK: - Event Emitter

  override func supportedEvents() -> [String]! {
    return ["onMouseMove", "onSpaceBar", "onKeyPress"]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  // MARK: - Key Monitor — swizzles root VC's pressesBegan to catch all key events

  @objc func startKeyMonitor() {
    DispatchQueue.main.async { [weak self] in
      guard let self = self,
            let rootVC = self.getActiveWindow()?.rootViewController else { return }
      KeyPressInterceptor.shared.callback = { [weak self] key in
        guard self?.hasListeners == true else { return }
        if key == "space" {
          self?.sendEvent(withName: "onSpaceBar", body: nil)
        } else {
          self?.sendEvent(withName: "onKeyPress", body: ["key": key])
        }
      }
      KeyPressInterceptor.shared.install(on: type(of: rootVC))
    }
  }

  @objc func stopKeyMonitor() {
    KeyPressInterceptor.shared.callback = nil
  }

  // MARK: - Mouse Monitor

  @objc func startMouseMonitor() {
    DispatchQueue.main.async { [weak self] in
      guard self?.hoverRecognizer == nil,
            let window = self?.getActiveWindow() else { return }
      let hover = UIHoverGestureRecognizer(target: self, action: #selector(self?.handleHover(_:)))
      window.addGestureRecognizer(hover)
      self?.hoverRecognizer = hover
    }
  }

  @objc private func handleHover(_ recognizer: UIHoverGestureRecognizer) {
    if hasListeners && (recognizer.state == .changed || recognizer.state == .began) {
      let loc = recognizer.location(in: recognizer.view)
      sendEvent(withName: "onMouseMove", body: ["x": loc.x, "y": loc.y])
    }
  }

  @objc func stopMouseMonitor() {
    DispatchQueue.main.async { [weak self] in
      if let hover = self?.hoverRecognizer,
         let window = self?.getActiveWindow() {
        window.removeGestureRecognizer(hover)
      }
      self?.hoverRecognizer = nil
    }
  }

  // MARK: - Titlebar

  @objc func setupTransparentTitlebar() {
    DispatchQueue.main.async { [weak self] in
      guard let nsWindow = self?.getNSWindow() else { return }
      nsWindow.setValue(true, forKey: "titlebarAppearsTransparent")
      if let styleMask = nsWindow.value(forKey: "styleMask") as? UInt {
        nsWindow.setValue(styleMask | (1 << 15), forKey: "styleMask")
      }
      if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
         let titlebar = scene.titlebar {
        titlebar.titleVisibility = .hidden
        titlebar.separatorStyle = .none
      }
    }
  }

  // MARK: - Fullscreen

  @objc func toggleFullscreen() {
    DispatchQueue.main.async { [weak self] in
      guard let nsWindow = self?.getNSWindow() else { return }
      _ = nsWindow.perform(NSSelectorFromString("toggleFullScreen:"), with: nil)
    }
  }

  @objc func isFullscreen(_ resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async { [weak self] in
      guard let nsWindow = self?.getNSWindow() else {
        resolve(false)
        return
      }
      if let styleMask = nsWindow.value(forKeyPath: "styleMask") as? UInt {
        resolve((styleMask & (1 << 14)) != 0)
      } else {
        resolve(false)
      }
    }
  }

  // MARK: - Toolbar

  @objc func setToolbarVisible(_ visible: Bool) {
    DispatchQueue.main.async {
      guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
            let titlebar = scene.titlebar else { return }
      titlebar.titleVisibility = .hidden
      titlebar.separatorStyle = .none
      if !visible { titlebar.toolbar = nil }
    }
  }

  // MARK: - Cursor

  @objc func setCursorVisible(_ visible: Bool) {
    DispatchQueue.main.async {
      if !visible {
        // setHiddenUntilMouseMoves: hides cursor, macOS auto-shows it when mouse moves
        guard let nsCursorClass = NSClassFromString("NSCursor") as? NSObject.Type else { return }
        // Call [NSCursor setHiddenUntilMouseMoves:YES] via NSInvocation since perform:with: can't pass BOOL
        let sel = NSSelectorFromString("setHiddenUntilMouseMoves:")
        guard let method = class_getClassMethod(nsCursorClass, sel) else { return }
        let imp = method_getImplementation(method)
        typealias SetHiddenFunc = @convention(c) (AnyObject, Selector, Bool) -> Void
        let fn = unsafeBitCast(imp, to: SetHiddenFunc.self)
        fn(nsCursorClass, sel, true)
      }
      // For visible=true, do nothing — macOS auto-shows cursor on mouse move
    }
  }

  // MARK: - Pointer cursor on interactive views
  @objc func enablePointerCursors() {
    DispatchQueue.main.async { [weak self] in
      guard self?.pointerHoverRecognizer == nil,
            let window = self?.getActiveWindow() else { return }
      let hover = UIHoverGestureRecognizer(target: self, action: #selector(self?.handlePointerHover(_:)))
      window.addGestureRecognizer(hover)
      self?.pointerHoverRecognizer = hover
    }
  }

  @objc private func handlePointerHover(_ recognizer: UIHoverGestureRecognizer) {
    guard let window = recognizer.view else { return }
    let point = recognizer.location(in: window)
    let hitView = window.hitTest(point, with: nil)

    let isButton: Bool = {
      guard let view = hitView else { return false }
      // Walk up the view hierarchy looking for a view with button accessibility traits
      // or a UIControl (like Slider), but not full-screen overlays
      var current: UIView? = view
      for _ in 0..<6 {
        guard let v = current else { break }
        // UIControl (sliders, switches, etc.)
        if v is UIControl {
          return true
        }
        // Check accessibility traits for button
        if v.accessibilityTraits.contains(.button) {
          return true
        }
        // Check nativeID set from React Native
        if v.accessibilityIdentifier == "playerButton" {
          return true
        }
        current = v.superview
      }
      return false
    }()

    guard let nsCursorClass = NSClassFromString("NSCursor") else { return }
    if isButton {
      if let handCursor = nsCursorClass.value(forKey: "pointingHandCursor") as? NSObject {
        handCursor.perform(NSSelectorFromString("set"))
      }
    } else {
      if let arrowCursor = nsCursorClass.value(forKey: "arrowCursor") as? NSObject {
        arrowCursor.perform(NSSelectorFromString("set"))
      }
    }
  }

  @objc override static func requiresMainQueueSetup() -> Bool { return false }
}

// MARK: - KeyPressInterceptor — swizzles pressesBegan on root VC to catch all key events
class KeyPressInterceptor: NSObject {
  static let shared = KeyPressInterceptor()
  var callback: ((String) -> Void)?
  private var installed = false

  func install(on vcClass: AnyClass) {
    guard !installed else { return }
    installed = true

    let originalSel = #selector(UIViewController.pressesBegan(_:with:))
    let swizzledSel = #selector(UIViewController.intercepted_pressesBegan(_:with:))

    guard let swizzledMethod = class_getInstanceMethod(UIViewController.self, swizzledSel) else { return }

    // Add the swizzled method to the target class, then swap
    let didAdd = class_addMethod(vcClass, swizzledSel,
                                  method_getImplementation(swizzledMethod),
                                  method_getTypeEncoding(swizzledMethod))

    if didAdd,
       let originalMethod = class_getInstanceMethod(vcClass, originalSel),
       let addedMethod = class_getInstanceMethod(vcClass, swizzledSel) {
      method_exchangeImplementations(originalMethod, addedMethod)
    }
  }
}

extension UIViewController {
  @objc func intercepted_pressesBegan(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
    for press in presses {
      guard let key = press.key else { continue }
      var keyName: String?
      switch key.keyCode {
      case .keyboardSpacebar: keyName = "space"
      case .keyboardLeftArrow: keyName = "left"
      case .keyboardRightArrow: keyName = "right"
      case .keyboardUpArrow: keyName = "up"
      case .keyboardDownArrow: keyName = "down"
      default: break
      }
      if let name = keyName {
        KeyPressInterceptor.shared.callback?(name)
      }
    }
    // Call original implementation (due to swizzle, this calls the original pressesBegan)
    self.intercepted_pressesBegan(presses, with: event)
  }
}
#else
@objc(FullscreenManager)
class FullscreenManager: RCTEventEmitter {
  override func supportedEvents() -> [String]! { return ["onMouseMove", "onSpaceBar", "onKeyPress"] }
  @objc func startMouseMonitor() {}
  @objc func stopMouseMonitor() {}
  @objc func startKeyMonitor() {}
  @objc func stopKeyMonitor() {}
  @objc func setupTransparentTitlebar() {}
  @objc func toggleFullscreen() {}
  @objc func isFullscreen(_ resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(false)
  }
  @objc func setToolbarVisible(_ visible: Bool) {}
  @objc func setCursorVisible(_ visible: Bool) {}
  @objc func enablePointerCursors() {}
  @objc override static func requiresMainQueueSetup() -> Bool { return false }
}
#endif
