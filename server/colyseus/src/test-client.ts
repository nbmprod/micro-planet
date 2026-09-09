import { Client } from '@colyseus/sdk';

// Phase 0 smoke test: proves connect -> join -> state sync -> leave works
// against a locally running `npm run dev` server, before any PlayCanvas
// client exists. Run with `npm run test-client` while `npm run dev` is up.
async function main() {
    const client = new Client('ws://localhost:2567');

    console.log('connecting...');
    const room = await client.joinOrCreate('micro_planet');
    console.log(`joined room ${room.roomId} as ${room.sessionId}`);

    room.onStateChange((state) => {
        console.log(`state change: ${state.players.size} player(s) present`);
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('leaving...');
    await room.leave();
    console.log('left cleanly');
}

main().catch((err) => {
    console.error('smoke test failed:', err);
    process.exit(1);
});
