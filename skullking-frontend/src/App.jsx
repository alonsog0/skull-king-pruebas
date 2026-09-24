import { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export default function App() {
  const [connected, setConnected] = useState(false);
  const [broadcastMessages, setBroadcastMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);

  // Cada pestaña genera o conserva su propio identificador único en sessionStorage
  const [senderName] = useState(() => {
    const storageKey = 'skullking-tab-id';
    const existingId = sessionStorage.getItem(storageKey);
    if (existingId) {
      return `Jugador_${existingId}`;
    }
    const generatedId = crypto.randomUUID().slice(0, 8);
    sessionStorage.setItem(storageKey, generatedId);
    return `Jugador_${generatedId}`;
  });

  const stompClientRef = useRef(null);

  useEffect(() => {
    /**
     * INICIALIZACIÓN DEL CLIENTE STOMP:
     * 1. webSocketFactory: usa SockJS apuntando al endpoint de Spring Boot (/ws-skullking).
     * 2. connectHeaders: envía la cabecera 'user' en el frame CONNECT.
     *    El backend (WebSocketConfig) la lee y le asigna identidad a esta conexión.
     */
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws-skullking'),
      connectHeaders: {
        user: senderName
      },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        console.log(`✅ Conectado como ${senderName}`);

        // 1. SUSCRIPCIÓN PÚBLICA (BROADCAST):
        // Todos los clientes escuchan en /topic/public
        client.subscribe('/topic/public', (message) => {
          const payload = JSON.parse(message.body);
          setBroadcastMessages((prev) => [...prev, payload]);
        });

        // 2. SUSCRIPCIÓN PRIVADA (ESTÁNDAR SPRING):
        // Todos los clientes se suscriben a '/user/queue/private'.
        // Spring sabe a qué socket físico enviarlo gracias a la identidad del usuario y al prefijo /user.
        client.subscribe('/user/queue/private', (message) => {
          const payload = JSON.parse(message.body);
          setPrivateMessages((prev) => [...prev, payload]);
        });
      },
      onDisconnect: () => {
        setConnected(false);
        console.log('❌ Desconectado');
      }
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (client) client.deactivate();
    };
  }, [senderName]);

  // Enviar mensaje Broadcast al servidor
  const sendBroadcast = () => {
    if (stompClientRef.current && connected) {
      stompClientRef.current.publish({
        destination: '/app/test-broadcast',
        body: JSON.stringify({
          sender: senderName,
          content: '¡Hola a todos en la mesa de juego!'
        })
      });
    }
  };

  // Enviar solicitud de mensaje privado al servidor
  const sendPrivateRequest = () => {
    if (stompClientRef.current && connected) {
      stompClientRef.current.publish({
        destination: '/app/test-private',
        body: JSON.stringify({
          sender: senderName,
          card: 'SKULL_KING'
        })
      });
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#2c3e50' }}>
      <header style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>Skull King - Plantilla WebSockets</h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', fontSize: '15px' }}>
          <div>
            Estado: <strong style={{ color: connected ? '#16a34a' : '#dc2626' }}>
              {connected ? '🟢 CONECTADO' : '🔴 DESCONECTADO'}
            </strong>
          </div>
          <div>
            Tu Identificador: <strong style={{ backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>{senderName}</strong>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={sendBroadcast}
          disabled={!connected}
          style={{
            padding: '10px 16px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: connected ? 'pointer' : 'not-allowed',
            fontWeight: '600'
          }}
        >
          Enviar Broadcast (/topic/public)
        </button>

        <button
          onClick={sendPrivateRequest}
          disabled={!connected}
          style={{
            padding: '10px 16px',
            backgroundColor: '#0d9488',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: connected ? 'pointer' : 'not-allowed',
            fontWeight: '600'
          }}
        >
          Pedir Carta Privada (/user/queue/private)
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* PANEL PÚBLICO */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', backgroundColor: '#ffffff' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1e293b' }}>
            Mensajes Públicos <span style={{ fontSize: '12px', color: '#64748b' }}>(/topic/public)</span>
          </h3>
          <div style={{ minHeight: '180px', maxHeight: '300px', overflowY: 'auto', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
            {broadcastMessages.length === 0 ? (
              <p style={{ color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>No hay mensajes públicos aún.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {broadcastMessages.map((msg, i) => (
                  <li key={i} style={{ marginBottom: '6px' }}>
                    <strong>{msg.sender}:</strong> {msg.content}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* PANEL PRIVADO */}
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '16px', backgroundColor: '#ffffff' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f766e' }}>
            Mis Mensajes Privados <span style={{ fontSize: '12px', color: '#64748b' }}>(/user/queue/private)</span>
          </h3>
          <div style={{ minHeight: '180px', maxHeight: '300px', overflowY: 'auto', backgroundColor: '#f0fdfa', padding: '10px', borderRadius: '6px' }}>
            {privateMessages.length === 0 ? (
              <p style={{ color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>No has recibido mensajes privados aún.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {privateMessages.map((msg, i) => (
                  <li key={i} style={{ marginBottom: '6px' }}>
                    {msg.content}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}