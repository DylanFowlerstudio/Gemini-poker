package com.example.poker;

import java.util.ArrayList;
import java.util.List;

public class Player {
    private String name;
    private List<Card> hand = new ArrayList<>();
    private boolean folded = false;
    private int chips = 1000;

    public Player() {
    }

    public Player(String name) {
        this.name = name;
    }

    public void addCard(Card card) {
        if (card != null) {
            hand.add(card);
        }
    }

    public void resetForRound() {
        hand.clear();
        folded = false;
    }

    public void fold() {
        folded = true;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<Card> getHand() {
        return hand;
    }

    public void setHand(List<Card> hand) {
        this.hand = hand;
    }

    public boolean isFolded() {
        return folded;
    }

    public void setFolded(boolean folded) {
        this.folded = folded;
    }

    public int getChips() {
        return chips;
    }

    public void setChips(int chips) {
        this.chips = chips;
    }
}
