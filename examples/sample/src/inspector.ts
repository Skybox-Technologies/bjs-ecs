import { KeyboardEventTypes } from '@babylonjs/core/Events/keyboardEvents';
import { Scene } from '@babylonjs/core/scene';

let inspectorImported = false;

export async function showInspector(show: boolean, scene: Scene) {
  if (!inspectorImported) {
    await import('@babylonjs/core/Debug/debugLayer');
    await import('@babylonjs/inspector');
    inspectorImported = true;
  }
  if (show) {
    void scene.debugLayer.show({
      embedMode: true,
    });
  } else {
    scene.debugLayer.hide();
  }
}

export function setupInspector(scene: Scene) {
  scene.onKeyboardObservable.add(async (kbInfo) => {
    switch (kbInfo.type) {
      case KeyboardEventTypes.KEYDOWN:
        // toggle inspector
        if (kbInfo.event.code === 'KeyI' && kbInfo.event.altKey) {
          if (scene.debugLayer.isVisible()) {
            showInspector(true, scene);
          } else {
            showInspector(false, scene);
          }
        }
        break;
    }
  });
}
