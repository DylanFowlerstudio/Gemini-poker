package com.example.poker;

import java.util.ArrayList;
import java.util.List;

public class PlayerState {
    private String name;
    private boolean folded;
    private int chips;
    private List<String> hand = new ArrayList<>();

    public PlayerState() {
    }

    public PlayerState(String name, boolean folded, int chips, List<String> hand) {
        this.name = name;
        this.folded = folded;
        this.chips = chips;
        this.hand = hand;
    }

    public String getName() {
        return name;
    }

    public boolean isFolded() {
        return folded;
    }

    public int getChips() {
        return chips;
    }

    public List<String> getHand() {
        return hand;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setFolded(boolean folded) {
        this.folded = folded;
    }

    public void setChips(int chips) {
        this.chips = chips;
    }

    public void setHand(List<String> hand) {
        this.hand = hand;
    }
}
