import * as THREE from 'three';
import { NetworkManager } from './NetworkManager';
import { Planet } from '../world/Planet';
import RemotePlayer from '../entities/RemotePlayer';
import { GameConfig } from '../config/GameConfig';

export class PlayerManager {
  private scene: THREE.Scene;
  private planet: Planet;
  private network: NetworkManager;
  private players: Map<string, RemotePlayer> = new Map();
  private interpolation: number;

  constructor(scene: THREE.Scene, planet: Planet, network: NetworkManager) {
    this.scene = scene;
    this.planet = planet;
    this.network = network;
    this.interpolation = GameConfig.network.interpolationFactor;

    this.network.on('connected', () => {
      // choose a random color to request
      const colors = GameConfig.playerColors as readonly number[];
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.network.sendJoin(color);
    });

    this.network.on('JOINED', (msg: any) => {
      if (msg.playerId) this.network.playerId = msg.playerId;
      // server may return otherPlayers list
      const others = msg.otherPlayers || [];
      for (const p of others) {
        if (p.playerId === this.network.playerId) continue;
        this._addOrUpdateRemote(p.playerId, p.color, p);
      }
    });

    this.network.on('PLAYER_JOINED', (msg: any) => {
      if (msg.playerId === this.network.playerId) return;
      this._addOrUpdateRemote(msg.playerId, msg.color, msg);
    });

    this.network.on('PLAYER_MOVED', (msg: any) => {
      if (!msg.playerId || msg.playerId === this.network.playerId) return;
      const p = this.players.get(msg.playerId);
      if (p) p.syncFromNetwork(msg);
    });

    this.network.on('PLAYER_LEFT', (msg: any) => {
      if (!msg.playerId) return;
      this.removePlayer(msg.playerId);
    });
  }

  private _addOrUpdateRemote(playerId: string, color: number, info?: any) {
    let p = this.players.get(playerId);
    if (!p) {
      p = new RemotePlayer(this.scene, playerId, color, this.planet);
      this.players.set(playerId, p);
    }
    if (info) p.syncFromNetwork(info);
  }

  removePlayer(playerId: string) {
    const p = this.players.get(playerId);
    if (!p) return;
    p.dispose(this.scene);
    this.players.delete(playerId);
  }

  update() {
    for (const p of this.players.values()) {
      p.update(this.planet, this.interpolation);
    }
  }
}

export default PlayerManager;
