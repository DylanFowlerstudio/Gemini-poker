package com.example.poker;

import java.util.ArrayList;
import java.util.List;

public class GameState {
    private String roomCode;
    private List<Player> players = new ArrayList<>();
    private List<Card> communityCards = new ArrayList<>();
    private boolean started = false;
    private String status = "Waiting for players...";

    public GameState() {
    }

    public GameState(String roomCode) {
        this.roomCode = roomCode;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public List<Player> getPlayers() {
        return players;
    }

    public void setPlayers(List<Player> players) {
        this.players = players;
    }

    public List<Card> getCommunityCards() {
        return communityCards;
    }

    public void setCommunityCards(List<Card> communityCards) {
        this.communityCards = communityCards;
    }

    public boolean isStarted() {
        return started;
    }

    public void setStarted(boolean started) {
        this.started = started;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
