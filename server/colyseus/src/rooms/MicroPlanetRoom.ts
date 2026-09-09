import { Room, Client } from 'colyseus';
import { MicroPlanetState, Player } from './schema/MicroPlanetState';

// Phase 0 room: proves connect/join/leave end to end and holds no game
// logic yet. Phase 2 adds authoritative movement (input in, validated
// state out) and Phase 3 wires this to persistence.
export class MicroPlanetRoom extends Room<{ state: MicroPlanetState }> {
    maxClients = 32;

    onCreate() {
        this.setState(new MicroPlanetState());
        console.log(`[MicroPlanetRoom] created: ${this.roomId}`);
    }

    onJoin(client: Client) {
        const player = new Player();
        player.joinedAt = Date.now();
        this.state.players.set(client.sessionId, player);
        console.log(`[MicroPlanetRoom] ${client.sessionId} joined (${this.state.players.size} total)`);
    }

    onLeave(client: Client) {
        this.state.players.delete(client.sessionId);
        console.log(`[MicroPlanetRoom] ${client.sessionId} left (${this.state.players.size} total)`);
    }

    onDispose() {
        console.log(`[MicroPlanetRoom] disposed: ${this.roomId}`);
    }
}
