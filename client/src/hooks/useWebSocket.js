import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5000/ws';

export const useWebSocket = (onStopLossTriggered) => {
  const [prices, setPrices] = useState({});
  const [connected, setConnected] = useState(false);
  const [flashMap, setFlashMap] = useState({});
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const onStopLossRef = useRef(onStopLossTriggered);

  // Keep callback ref up to date
  useEffect(() => { onStopLossRef.current = onStopLossTriggered; }, [onStopLossTriggered]);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        reconnectTimerRef.current = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'SNAPSHOT') {
            const map = {};
            msg.data.forEach((s) => (map[s.symbol] = s));
            setPrices(map);
          } else if (msg.type === 'PRICE_UPDATE') {
            const flashes = {};
            setPrices((prev) => {
              const updated = { ...prev };
              msg.data.forEach((s) => {
                const prevPrice = prev[s.symbol]?.price;
                if (prevPrice !== undefined && prevPrice !== s.price) {
                  flashes[s.symbol] = s.price > prevPrice ? 'green' : 'red';
                }
                updated[s.symbol] = s;
              });
              return updated;
            });
            if (Object.keys(flashes).length > 0) {
              setFlashMap((prev) => ({ ...prev, ...flashes }));
              setTimeout(() => {
                setFlashMap((prev) => {
                  const next = { ...prev };
                  Object.keys(flashes).forEach((k) => delete next[k]);
                  return next;
                });
              }, 800);
            }
          } else if (msg.type === 'STOP_LOSS_TRIGGERED') {
            // Notify the app so AuthContext can update the balance
            if (onStopLossRef.current) {
              onStopLossRef.current(msg);
            }
          }
        } catch (e) {}
      };
    } catch (e) {
      reconnectTimerRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { prices, connected, flashMap };
};