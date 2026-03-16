package com.example.poker.model;

public class PublicPlayerView {
    private String name;
    private boolean folded;
    private int chipCount;
    private int handSize;

    public PublicPlayerView(String name, boolean folded, int chipCount, int handSize) {
        this.name = name;
        this.folded = folded;
        this.chipCount = chipCount;
        this.handSize = handSize;
    }

    public String getName() { return name; }
    public boolean isFolded() { return folded; }
    public int getChipCount() { return chipCount; }
    public int getHandSize() { return handSize; }
}
