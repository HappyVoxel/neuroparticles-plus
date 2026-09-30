import { createHost, type SimRequest } from "./host";

// Runs the sim off the main thread, so a slow step never holds up a frame.
const handle = createHost((reply) => self.postMessage(reply));
self.addEventListener("message", (e: MessageEvent<SimRequest>) => handle(e.data));
