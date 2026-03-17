package com.example.poker;

import java.util.ArrayList;
import java.util.List;

public class PublicPlayerView {
    private String name;
    private boolean folded;
    private int chips;
    private int handSize;
    private List<String> hand = new ArrayList<>();

    public PublicPlayerView() {
    }

    public PublicPlayerView(String name, boolean folded, int chips, int handSize, List<String> hand) {
        this.name = name;
        this.folded = folded;
        this.chips = chips;
        this.handSize = handSize;
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

    public int getHandSize() {
        return handSize;
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

    public void setHandSize(int handSize) {
        this.handSize = handSize;
    }

    public void setHand(List<String> hand) {
        this.hand = hand;
    }
}
