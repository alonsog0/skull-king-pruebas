package com.tfg.skullking_backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

/**
 * Controlador de prueba para WebSockets con STOMP.
 */
@Controller
public class SpikeController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * 1. Broadcast Público:
     * El cliente envía a '/app/test-broadcast'.
     * Con @SendTo("/topic/public"), Spring retransmite el retorno a todos los suscritos.
     */
    @MessageMapping("/test-broadcast")
    @SendTo("/topic/public")
    public Map<String, String> processBroadcast(Map<String, String> message) {
        String sender = message.getOrDefault("sender", "Anónimo");
        String content = message.getOrDefault("content", "Sin mensaje");

        return Map.of(
            "sender", sender,
            "content", "Broadcast recibido: " + content
        );
    }

    /**
     * 2. Mensaje Privado a un Usuario Específico:
     * El cliente envía a '/app/test-private'.
     * Spring inyecta automáticamente el 'Principal' de la sesión que configuramos en WebSocketConfig.
     * Enviamos con messagingTemplate.convertAndSendToUser(targetUser, "/queue/private", ...).
     *
     * En el frontend el usuario solo se suscribe a: '/user/queue/private'.
     * Spring se encarga internamente de enrutarlo únicamente al socket de este usuario.
     */
    @MessageMapping("/test-private")
    public void processPrivate(Map<String, String> message, Principal principal) {
        String targetUser = (principal != null) ? principal.getName() : message.getOrDefault("sender", "Anónimo");
        String card = message.getOrDefault("card", "SKULL_KING");
        String randomId = UUID.randomUUID().toString().substring(0, 6).toUpperCase();

        messagingTemplate.convertAndSendToUser(
            targetUser,
            "/queue/private",
            Map.of("content", "Tu carta secreta es: " + card + " [ID: " + randomId + "]")
        );
    }
}