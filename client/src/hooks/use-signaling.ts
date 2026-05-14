import { useEffect, useRef, useCallback } from "react";

export interface SignalingMessage {
    type: "offer" | "answer" | "ice-candidate" | "join-room" | "ready";
    roomId: string;
    payload: any;
}

export function useSignaling(roomId: string | undefined, onMessage: (message: SignalingMessage) => void) {
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!roomId) return;

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const socket = new WebSocket(`${protocol}//${host}/ws/signaling`);

        socket.onopen = () => {
            console.log(`[Signaling] Socket open. Room: ${roomId}`);
            socket.send(JSON.stringify({ type: "join-room", roomId }));
        };

        socket.onmessage = (event) => {
            try {
                const message: SignalingMessage = JSON.parse(event.data);
                console.log(`[Signaling] Received: ${message.type}`);
                onMessage(message);
            } catch (err) {
                console.error("[Signaling] Parse error:", err);
            }
        };

        socket.onclose = (e) => {
            console.log(`[Signaling] Socket closed. Code: ${e.code}, Reason: ${e.reason}`);
        };

        socket.onerror = (err) => {
            console.error("[Signaling] Socket error:", err);
        };

        socketRef.current = socket;

        return () => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.close();
            }
        };
    }, [roomId, onMessage]);

    const sendSignalingMessage = useCallback((type: SignalingMessage["type"], payload: any) => {
        if (socketRef.current?.readyState === WebSocket.OPEN && roomId) {
            socketRef.current.send(JSON.stringify({ type, roomId, payload }));
        }
    }, [roomId]);

    return { sendSignalingMessage };
}
