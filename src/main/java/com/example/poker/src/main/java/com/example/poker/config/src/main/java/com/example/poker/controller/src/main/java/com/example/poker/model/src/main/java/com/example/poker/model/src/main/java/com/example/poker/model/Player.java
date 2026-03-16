package com.example.poker.model;

import java.util.ArrayList;
import java.util.List;

public class Player {
    private String name;
    private List<Card> hand = new ArrayList<>();
    private boolean folded = false;
    private int chips = 1000;

    public Player(String name) {
        this.name = name;
    }

    public String getName() { return name; }
    public List<Card> getHand() { return hand; }
    public boolean isFolded() { return folded; }
    public int getChips() { return chips; }

    public void addCard(Card card) {
        hand.add(card);
    }

    public void fold() {
        folded = true;
    }

    public void resetForRound() {
        hand.clear();
        folded = false;
    }
}
