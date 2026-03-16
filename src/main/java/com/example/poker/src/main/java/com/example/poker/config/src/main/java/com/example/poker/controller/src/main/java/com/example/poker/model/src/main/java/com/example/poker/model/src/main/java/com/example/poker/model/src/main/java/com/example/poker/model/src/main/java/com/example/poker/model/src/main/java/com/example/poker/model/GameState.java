package com.example.poker.model;

import java.util.ArrayList;
import java.util.List;

public class GameState {
    private String roomCode;
    private List<Player> players = new ArrayList<>();
    private List<Card> communityCards = new ArrayList<>();
    private String status = "Waiting for players...";
    private boolean started = false;

    public GameState(String roomCode) {
        this.roomCode = roomCode;
    }

    public String getRoomCode() { return roomCode; }
    public List<Player> getPlayers() { return players; }
    public List<Card> getCommunityCards() { return communityCards; }
    public String getStatus() { return status; }
    public boolean isStarted() { return started; }

    public void setStatus(String status) { this.status = status; }
    public void setStarted(boolean started) { this.started = started; }
}
