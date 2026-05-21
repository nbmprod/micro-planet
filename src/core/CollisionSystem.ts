import * as THREE from 'three';

export interface ColliderRegistration {
  position: THREE.Vector3;
  radius: number;
}

export class CollisionSystem {
  private readonly _colliders: ColliderRegistration[] = [];
  private readonly _scratch = new THREE.Vector3();

  public registerCollider(position: THREE.Vector3, radius: number): void {
    this._colliders.push({ position: position.clone(), radius });
  }

  public queryCollision(worldPosition: THREE.Vector3, radius: number): boolean {
    for (const entry of this._colliders) {
      const minDistance = radius + entry.radius;
      if (this._scratch.copy(worldPosition).distanceToSquared(entry.position) < minDistance * minDistance) {
        return true;
      }
    }

    return false;
  }
}
