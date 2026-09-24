package com.tfg.skullking_backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configuración central de WebSockets y STOMP.
 *
 * Flujo básico:
 * 1. Conexión: El cliente se conecta al endpoint '/ws-skullking' (usando SockJS).
 * 2. Cliente -> Servidor: Las peticiones van con prefijo '/app' (mapeadas en @MessageMapping).
 * 3. Servidor -> Clientes (Broadcast): Difusión pública mediante '/topic'.
 * 4. Servidor -> Cliente (Privado): Mensajes personales mediante '/user' (ej: /user/queue/private).
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Habilita el broker en memoria para destinos públicos (/topic) y privados (/queue)
        config.enableSimpleBroker("/topic", "/queue");

        // Prefijo para mensajes entrantes desde clientes hacia controladores (@MessageMapping)
        config.setApplicationDestinationPrefixes("/app");

        // Prefijo que Spring utiliza internamente para resolver destinos de usuario (/user/queue/...)
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint HTTP donde el cliente inicia la negociación WebSocket/SockJS
        registry.addEndpoint("/ws-skullking")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Interceptor que captura la cabecera 'user' al conectar y le asigna identidad a la sesión
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String user = accessor.getFirstNativeHeader("user");
                    if (user != null && !user.isBlank()) {
                        // Asignamos la identidad (Principal) para que Spring sepa quién es este socket
                        accessor.setUser(() -> user);
                    }
                }
                return message;
            }
        });
    }
}