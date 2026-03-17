package com.example.poker;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class PokerWebSocketController {

    private final PokerService pokerService;

    public PokerWebSocketController(PokerService pokerService) {
        this.pokerService = pokerService;
    }

    @MessageMapping("/join")
    public void join(@Payload Map<String, String> payload) {
        String roomCode = payload.get("roomCode");
        String playerName = payload.get("playerName");
        pokerService.joinRoom(roomCode, playerName);
    }

    @MessageMapping("/start")
    public void start(@Payload Map<String, String> payload) {
        String roomCode = payload.get("roomCode");
        pokerService.startGame(roomCode);
    }

    @MessageMapping("/action")
    public void action(@Payload Map<String, String> payload) {
        String roomCode = payload.get("roomCode");
        String playerName = payload.get("playerName");
        String action = payload.get("action");
        pokerService.playerAction(roomCode, playerName, action);
    }
}
