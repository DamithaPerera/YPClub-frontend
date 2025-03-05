import { useEffect, useRef, useCallback } from 'react';

const useWebSocket = (url, onMessage) => {
    const wsRef = useRef(null);

    const connect = useCallback(() => {
        wsRef.current = new WebSocket(url);
        wsRef.current.onopen = () => {
            console.log("WebSocket connected");
        };
        wsRef.current.onmessage = (event) => {
            if (onMessage) {
                onMessage(event);
            }
        };
        wsRef.current.onerror = (error) => {
            console.error("WebSocket error:", error);
        };
        wsRef.current.onclose = () => {
            console.log("WebSocket closed, attempting reconnect in 3 seconds...");
            setTimeout(connect, 3000);
        };
    }, [url, onMessage]);

    useEffect(() => {
        connect();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    return wsRef;
};

export default useWebSocket;
