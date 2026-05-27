import * as THREE from 'three';
import { GameConfig } from '../config/GameConfig';

export class RemotePlayer {
  id: string;
  color: number;
  private _group: THREE.Group;
  private _visual: THREE.Group;
  private _targetSurfaceNormal: THREE.Vector3 = new THREE.Vector3();
  private _targetForward: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  private _targetAltitude: number = 0;

  private _currentSurfaceNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  private _currentForward: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  private _currentAltitude: number = 0;

  constructor(scene: THREE.Scene, id: string, color: number) {
    this.id = id;
    this.color = color;

    this._group = new THREE.Group();
    this._visual = new THREE.Group();
    this._visual.add(this._buildPlaceholder(color));
    this._group.add(this._visual);
    scene.add(this._group);

    // Initialize somewhere on the surface
    this._currentSurfaceNormal.set(0, 1, 0);
    this._currentForward.set(0, 0, -1);
    this._applyTransform();
  }

  dispose(scene: THREE.Scene) {
    scene.remove(this._group);
  }

  syncFromNetwork(msg: any) {
    if (msg.position && Array.isArray(msg.position)) {
      this._targetSurfaceNormal.set(msg.position[0], msg.position[1], msg.position[2]).normalize();
    }
    if (msg.forward && Array.isArray(msg.forward)) {
      this._targetForward.set(msg.forward[0], msg.forward[1], msg.forward[2]).normalize();
    }
    if (typeof msg.altitude === 'number') this._targetAltitude = msg.altitude;
  }

  update(interpolationFactor: number) {
    // Lerp normals and forward then renormalize
    this._currentSurfaceNormal.lerp(this._targetSurfaceNormal, interpolationFactor).normalize();
    this._currentForward.lerp(this._targetForward, interpolationFactor).normalize();
    this._currentAltitude += (this._targetAltitude - this._currentAltitude) * interpolationFactor;

    this._applyTransform();
  }

  private _applyTransform() {
    const radius = GameConfig.planet.radius + this._currentAltitude;
    this._group.position.copy(this._currentSurfaceNormal).multiplyScalar(radius);

    // Orientation: align +Y to surface normal
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, this._currentSurfaceNormal);
    const currentLook = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    const facingRot = new THREE.Quaternion().setFromUnitVectors(currentLook, this._currentForward);
    q.premultiply(facingRot);
    this._group.quaternion.copy(q);
  }

  private _buildPlaceholder(color: number) {
    const placeholder = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(
        GameConfig.player.bodyDimensions.x,
        GameConfig.player.bodyDimensions.y,
        GameConfig.player.bodyDimensions.z,
      ),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6 }),
    );
    body.castShadow = true;
    body.position.y = GameConfig.player.height;
    placeholder.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(GameConfig.player.headRadius, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xf5c58a, roughness: 0.5 }),
    );
    head.castShadow = true;
    head.position.y = GameConfig.player.height + GameConfig.player.headOffsetY;
    placeholder.add(head);

    const eyeGeo = new THREE.SphereGeometry(GameConfig.player.eyeRadius, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    for (const x of [-GameConfig.player.eyeOffsetX, GameConfig.player.eyeOffsetX]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(x, GameConfig.player.height + GameConfig.player.eyeOffsetY, GameConfig.player.eyeOffsetZ);
      placeholder.add(eye);
    }

    return placeholder;
  }
}

export default RemotePlayer;
