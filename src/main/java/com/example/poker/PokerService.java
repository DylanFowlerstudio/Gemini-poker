package com.example.poker;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class PokerService {

    private final SimpMessagingTemplate messagingTemplate;
    private final Map<String, GameState> rooms = new HashMap<>();
    private final Random random = new Random();

    public PokerService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void joinRoom(String roomCode, String playerName) {
        if (roomCode == null || roomCode.isBlank() || playerName == null || playerName.isBlank()) {
            return;
        }

        roomCode = roomCode.toUpperCase().trim();
        playerName = playerName.trim();

        GameState room = rooms.computeIfAbsent(roomCode, GameState::new);

        boolean alreadyExists = room.getPlayers().stream()
                .anyMatch(p -> p.getName().equalsIgnoreCase(playerName));

        if (!alreadyExists) {
            room.getPlayers().add(new Player(playerName));
        }

        room.setStatus("Waiting for players... (" + room.getPlayers().size() + "/2 minimum)");
        broadcastRoom(roomCode);
    }

    public void startGame(String roomCode) {
        if (roomCode == null || roomCode.isBlank()) return;

        roomCode = roomCode.toUpperCase().trim();
        GameState room = rooms.get(roomCode);

        if (room == null) return;

        if (room.getPlayers().size() < 2) {
            room.setStatus("Need at least 2 players to start.");
            broadcastRoom(roomCode);
            return;
        }

        for (Player player : room.getPlayers()) {
            player.resetForRound();
        }

        room.getCommunityCards().clear();
        room.setStarted(true);

        Deck deck = new Deck();

        // Deal 2 hole cards to each player
        for (int i = 0; i < 2; i++) {
            for (Player player : room.getPlayers()) {
                player.addCard(deck.dealCard());
            }
        }

        // Simple V2: reveal all 5 community cards immediately
        for (int i = 0; i < 5; i++) {
            room.getCommunityCards().add(deck.dealCard());
        }

        Player winner = determineWinner(room.getPlayers(), room.getCommunityCards());

        if (winner != null) {
            HandRank best = evaluateBestHand(winner.getHand(), room.getCommunityCards());
            room.setStatus("Winner: " + winner.getName() + " with " + best.name);
        } else {
            room.setStatus("No winner could be determined.");
        }

        broadcastRoom(roomCode);
    }

    public void playerAction(String roomCode, String playerName, String action) {
        if (roomCode == null || playerName == null || action == null) return;

        roomCode = roomCode.toUpperCase().trim();
        playerName = playerName.trim();
        action = action.trim();

        GameState room = rooms.get(roomCode);
        if (room == null) return;

        Player player = room.getPlayers().stream()
                .filter(p -> p.getName().equalsIgnoreCase(playerName))
                .findFirst()
                .orElse(null);

        if (player == null) return;

        switch (action.toLowerCase()) {
            case "fold" -> {
                player.fold();
                room.setStatus(player.getName() + " folded.");
            }
            case "check" -> room.setStatus(player.getName() + " checked.");
            case "call" -> room.setStatus(player.getName() + " called.");
            default -> room.setStatus(player.getName() + " did action: " + action);
        }

        broadcastRoom(roomCode);
    }

    public String generateRoomCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder code = new StringBuilder();

        for (int i = 0; i < 5; i++) {
            code.append(chars.charAt(random.nextInt(chars.length())));
        }

        return code.toString();
    }

    private void broadcastRoom(String roomCode) {
        GameState room = rooms.get(roomCode);
        if (room == null) return;

        Map<String, Object> payload = new HashMap<>();
        payload.put("roomCode", room.getRoomCode());
        payload.put("status", room.getStatus());
        payload.put("started", room.isStarted());

        List<PublicPlayerView> publicPlayers = new ArrayList<>();
        for (Player p : room.getPlayers()) {
            List<String> handStrings = p.getHand().stream()
                    .map(Card::toString)
                    .collect(Collectors.toList());

            PublicPlayerView view = new PublicPlayerView(
                    p.getName(),
                    p.isFolded(),
                    p.getChips(),
                    p.getHand().size(),
                    handStrings
            );

            publicPlayers.add(view);
        }

        payload.put("players", publicPlayers);

        List<String> community = room.getCommunityCards().stream()
                .map(Card::toString)
                .collect(Collectors.toList());

        payload.put("communityCards", community);

        messagingTemplate.convertAndSend("/topic/room/" + roomCode, payload);
    }

    private Player determineWinner(List<Player> players, List<Card> communityCards) {
        List<Player> activePlayers = players.stream()
                .filter(p -> !p.isFolded())
                .collect(Collectors.toList());

        if (activePlayers.isEmpty()) return null;

        Player bestPlayer = activePlayers.get(0);
        HandRank bestRank = evaluateBestHand(bestPlayer.getHand(), communityCards);

        for (int i = 1; i < activePlayers.size(); i++) {
            Player current = activePlayers.get(i);
            HandRank currentRank = evaluateBestHand(current.getHand(), communityCards);

            if (currentRank.compareTo(bestRank) > 0) {
                bestRank = currentRank;
                bestPlayer = current;
            }
        }

        return bestPlayer;
    }

    private HandRank evaluateBestHand(List<Card> holeCards, List<Card> communityCards) {
        List<Card> all = new ArrayList<>();
        all.addAll(holeCards);
        all.addAll(communityCards);

        List<List<Card>> combos = combinations(all, 5);

        HandRank best = null;
        for (List<Card> combo : combos) {
            HandRank rank = evaluateFiveCardHand(combo);
            if (best == null || rank.compareTo(best) > 0) {
                best = rank;
            }
        }

        return best;
    }

    private List<List<Card>> combinations(List<Card> cards, int choose) {
        List<List<Card>> result = new ArrayList<>();
        combine(cards, choose, 0, new ArrayList<>(), result);
        return result;
    }

    private void combine(List<Card> cards, int choose, int start, List<Card> current, List<List<Card>> result) {
        if (current.size() == choose) {
            result.add(new ArrayList<>(current));
            return;
        }

        for (int i = start; i < cards.size(); i++) {
            current.add(cards.get(i));
            combine(cards, choose, i + 1, current, result);
            current.remove(current.size() - 1);
        }
    }

    private HandRank evaluateFiveCardHand(List<Card> hand) {
        List<Integer> values = hand.stream()
                .map(Card::getValue)
                .sorted()
                .collect(Collectors.toList());

        Map<Integer, Integer> counts = new HashMap<>();
        for (int v : values) {
            counts.put(v, counts.getOrDefault(v, 0) + 1);
        }

        boolean flush = hand.stream().map(Card::getSuit).distinct().count() == 1;
        boolean straight = isStraight(values);

        List<Integer> sortedByCountThenValue = counts.entrySet().stream()
                .sorted((a, b) -> {
                    int cmp = Integer.compare(b.getValue(), a.getValue());
                    if (cmp == 0) {
                        return Integer.compare(b.getKey(), a.getKey());
                    }
                    return cmp;
                })
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        List<Integer> tiebreakers = new ArrayList<>();
        for (Integer val : sortedByCountThenValue) {
            for (int i = 0; i < counts.get(val); i++) {
                tiebreakers.add(val);
            }
        }

        if (straight && flush) {
            int high = straightHigh(values);
            return new HandRank(8, "Straight Flush", List.of(high));
        }

        if (counts.containsValue(4)) {
            return new HandRank(7, "Four of a Kind", tiebreakers);
        }

        if (counts.containsValue(3) && counts.containsValue(2)) {
            return new HandRank(6, "Full House", tiebreakers);
        }

        if (flush) {
            List<Integer> desc = new ArrayList<>(values);
            desc.sort(Collections.reverseOrder());
            return new HandRank(5, "Flush", desc);
        }

        if (straight) {
            int high = straightHigh(values);
            return new HandRank(4, "Straight", List.of(high));
        }

        if (counts.containsValue(3)) {
            return new HandRank(3, "Three of a Kind", tiebreakers);
        }

        long pairCount = counts.values().stream().filter(c -> c == 2).count();

        if (pairCount == 2) {
            return new HandRank(2, "Two Pair", tiebreakers);
        }

        if (pairCount == 1) {
            return new HandRank(1, "One Pair", tiebreakers);
        }

        List<Integer> desc = new ArrayList<>(values);
        desc.sort(Collections.reverseOrder());
        return new HandRank(0, "High Card", desc);
    }

    private boolean isStraight(List<Integer> values) {
        List<Integer> unique = values.stream().distinct().sorted().collect(Collectors.toList());

        if (unique.size() != 5) return false;

        // A-2-3-4-5 straight
        if (unique.equals(List.of(2, 3, 4, 5, 14))) return true;

        for (int i = 1; i < unique.size(); i++) {
            if (unique.get(i) != unique.get(i - 1) + 1) {
                return false;
            }
        }

        return true;
    }

    private int straightHigh(List<Integer> values) {
        List<Integer> unique = values.stream().distinct().sorted().collect(Collectors.toList());
        if (unique.equals(List.of(2, 3, 4, 5, 14))) {
            return 5;
        }
        return unique.get(unique.size() - 1);
    }

    private static class HandRank implements Comparable<HandRank> {
        private final int rank;
        private final String name;
        private final List<Integer> kickers;

        public HandRank(int rank, String name, List<Integer> kickers) {
            this.rank = rank;
            this.name = name;
            this.kickers = kickers;
        }

        @Override
        public int compareTo(HandRank other) {
            if (this.rank != other.rank) {
                return Integer.compare(this.rank, other.rank);
            }

            for (int i = 0; i < Math.min(this.kickers.size(), other.kickers.size()); i++) {
                if (!this.kickers.get(i).equals(other.kickers.get(i))) {
                    return Integer.compare(this.kickers.get(i), other.kickers.get(i));
                }
            }

            return 0;
        }
    }
}
