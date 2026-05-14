import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { log } from "./app";

interface SignalingMessage {
    type: "offer" | "answer" | "ice-candidate" | "join-room" | "ready";
    roomId: string;
    payload: any;
}

interface Client {
    ws: WebSocket;
    roomId: string;
}

export function setupSignaling(server: Server) {
    const wss = new WebSocketServer({ server, path: "/ws/signaling" });
    const clients = new Set<Client>();

    log("Signaling server initialized", "ws");

    wss.on("connection", (ws) => {
        let currentClient: Client | null = null;

        ws.on("message", (data) => {
            try {
                const message: SignalingMessage = JSON.parse(data.toString());

                if (message.type === "join-room") {
                    currentClient = { ws, roomId: message.roomId };
                    clients.add(currentClient);
                    log(`User joined room: ${message.roomId}`, "ws");
                    return;
                }

                if (!currentClient) return;

                // Broadcast to others in the same room
                clients.forEach((client) => {
                    if (client !== currentClient && client.roomId === currentClient?.roomId && client.ws.readyState === WebSocket.OPEN) {
                        log(`Broadcasting ${message.type} in room ${message.roomId}`, "ws");
                        client.ws.send(JSON.stringify(message));
                    }
                });
            } catch (err) {
                console.error("Error processing signaling message:", err);
            }
        });

        ws.on("close", () => {
            if (currentClient) {
                clients.delete(currentClient);
                log(`User left room: ${currentClient.roomId}`, "ws");
            }
        });

        ws.on("error", (err) => {
            console.error("WebSocket error:", err);
            if (currentClient) {
                clients.delete(currentClient);
            }
        });
    });

    return wss;
}
