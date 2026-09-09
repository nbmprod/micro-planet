import { schema, t, type SchemaType } from '@colyseus/schema';

// Phase 0: bare-bones presence only, proving connect/join/leave round-trips
// through Colyseus state sync. Phase 2 replaces `joinedAt` with the real
// authoritative movement state (surfaceNormal/forward/altitude) that today
// lives in the client-only GameState (see src/core/GameState.ts).
export const Player = schema(
    {
        joinedAt: t.number(),
    },
    'Player',
);
export type Player = SchemaType<typeof Player>;

export const MicroPlanetState = schema(
    {
        players: t.map(Player),
    },
    'MicroPlanetState',
);
export type MicroPlanetState = SchemaType<typeof MicroPlanetState>;
