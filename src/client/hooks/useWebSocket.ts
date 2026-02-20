import { useState, useEffect, useRef, useCallback } from 'react';

export interface WSMessage {
  type: 'agent_message' | 'typing' | 'error';
  content?: string;
  rich_content?: unknown[];
  section?: string;
  session_status?: string;
  contour_completeness?: number;
  status?: boolean;
  error?: string;
}

interface UseWebSocketReturn {
  connected: boolean;
  typing: boolean;
  messages: WSMessage[];
  send: (data: unknown) => void;
  clearMessages: () => void;
}

export function useWebSocket(sessionId: string | null): UseWebSocketReturn {
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<WSMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connect = useCallback(() => {
    if (!sessionId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/ws?session_id=${sessionId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data: WSMessage = JSON.parse(event.data);

      if (data.type === 'typing') {
        setTyping(data.status ?? false);
      } else {
        setMessages((prev) => [...prev, data]);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setTyping(false);
      // Auto-reconnect after 3s
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [sessionId]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { connected, typing, messages, send, clearMessages };
}
