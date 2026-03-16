package com.example.poker.controller;

import com.example.poker.service.PokerService;
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
        pokerService.joinRoom(payload.get("roomCode"), payload.get("playerName"));
    }

    @MessageMapping("/start")
    public void start(@Payload Map<String, String> payload) {
        pokerService.startGame(payload.get("roomCode"));
    }

    @MessageMapping("/action")
    public void action(@Payload Map<String, String> payload) {
        pokerService.playerAction(
                payload.get("roomCode"),
                payload.get("playerName"),
                payload.get("action")
        );
    }
}
