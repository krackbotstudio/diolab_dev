import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../server/app";

let appPromise: ReturnType<typeof createApp> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) {
    appPromise = createApp({
      setupVite: false,
      enableSignaling: false,
    });
  }

  const { app } = await appPromise;
  return app(req, res);
}
