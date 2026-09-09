import { defineServer, defineRoom } from 'colyseus';
import { MicroPlanetRoom } from './rooms/MicroPlanetRoom';

const port = parseInt(process.env.PORT ?? '2567', 10);

const server = defineServer({
    rooms: {
        micro_planet: defineRoom(MicroPlanetRoom),
    },
});

server.listen(port);
console.log(`[colyseus] listening on ws://localhost:${port}`);
