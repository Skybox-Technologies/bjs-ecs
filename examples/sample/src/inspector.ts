import { KeyboardEventTypes } from "@babylonjs/core/Events/keyboardEvents";
import { Scene } from "@babylonjs/core/scene";

let inspectorImported = false;

export function setupInspector(scene: Scene) {
  scene.onKeyboardObservable.add(async (kbInfo) => {
    switch (kbInfo.type) {
      case KeyboardEventTypes.KEYDOWN:
        // toggle inspector
        if (kbInfo.event.code === "KeyI" && kbInfo.event.altKey) {
          if (!inspectorImported) {
            await import("@babylonjs/core/Debug/debugLayer");
            await import("@babylonjs/inspector");
            inspectorImported = true;
          }

          if (scene.debugLayer.isVisible()) {
            scene.debugLayer.hide();
          } else {
            void scene.debugLayer.show();
          }
        }
        break;
    }
  });
}
