declare module 'three/examples/jsm/loaders/FBXLoader' {
  import * as THREE from 'three';

  export class FBXLoader extends THREE.Loader {
    constructor(manager?: THREE.LoadingManager);
    load(
      url: string,
      onLoad: (object: THREE.Group) => void,
      onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (event: ErrorEvent) => void,
    ): void;
    parse(buffer: ArrayBuffer, path: string): THREE.Group;
  }
}
