import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   1) PASTE YOUR FIREBASE CONFIG HERE
   ========================= */
const firebaseConfig = {
  apiKey: "AIzaSyCoHUz0jK7f7qJVvHXhJNNIbPTGN7vAnjQ",
  authDomain: "pokerbyai.firebaseapp.com",
  projectId: "pokerbyai",
  storageBucket: "pokerbyai.firebasestorage.app",
  messagingSenderId: "1082184395114",
  appId: "1:1082184395114:web:78db5988c967d2a5579d13"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* =========================
   2) DOM REFERENCES
   ========================= */
const playerNameInput = document.getElementById("playerName");
const roomCodeInput = document.getElementById("roomCode");

const joinBtn = document.getElementById("joinBtn");
const startBtn = document.getElementById("startBtn");
const randomRoomBtn = document.getElementById("randomRoomBtn");

const checkBtn = document.getElementById("checkBtn");
const callBtn = document.getElementById("callBtn");
const foldBtn = document.getElementById("foldBtn");
const nextStreetBtn = document.getElementById("nextStreetBtn");

const statusText = document.getElementById("statusText");
const currentRoomText = document.getElementById("currentRoom");
const potText = document.getElementById("potText");
const turnText = document.getElementById("turnText");

const communityCardsDiv = document.getElementById("communityCards");
const myHandDiv = document.getElementById("myHand");
const myHandRankText = document.getElementById("myHandRank");
const playersListDiv = document.getElementById("playersList");

/* =========================
   3) LOCAL STATE
   ========================= */
let currentRoomCode = "";
let currentPlayerName = "";
let unsubscribeRoom = null;

/* =========================
   4) HELPERS
   ========================= */
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function createDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const deck = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(`${rank}${suit}`);
    }
  }

  return shuffle(deck);
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function rankValue(rank) {
  const map = {
    "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
    "J": 11, "Q": 12, "K": 13, "A": 14
  };
  return map[rank];
}

function parseCard(card) {
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  return { rank, suit, value: rankValue(rank) };
}

function combinations(arr, k) {
  const result = [];
  function helper(start, combo) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  helper(0, []);
  return result;
}

function evaluateFiveCardHand(cards) {
  const parsed = cards.map(parseCard).sort((a, b) => b.value - a.value);
  const values = parsed.map(c => c.value);
  const suits = parsed.map(c => c.suit);

  const counts = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;

  const entries = Object.entries(counts)
    .map(([value, count]) => ({ value: Number(value), count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.value - a.value;
    });

  const isFlush = suits.every(s => s === suits[0]);

  let uniqueVals = [...new Set(values)].sort((a, b) => b - a);
  let isStraight = false;
  let straightHigh = 0;

  if (uniqueVals.length === 5) {
    if (uniqueVals[0] - uniqueVals[4] === 4) {
      isStraight = true;
      straightHigh = uniqueVals[0];
    } else if (JSON.stringify(uniqueVals) === JSON.stringify([14, 5, 4, 3, 2])) {
      isStraight = true;
      straightHigh = 5;
    }
  }

  if (isStraight && isFlush) {
    return { category: 8, tiebreakers: [straightHigh], name: "Straight Flush" };
  }

  if (entries[0].count === 4) {
    const quad = entries[0].value;
    const kicker = entries[1].value;
    return { category: 7, tiebreakers: [quad, kicker], name: "Four of a Kind" };
  }

  if (entries[0].count === 3 && entries[1].count === 2) {
    return { category: 6, tiebreakers: [entries[0].value, entries[1].value], name: "Full House" };
  }

  if (isFlush) {
    return { category: 5, tiebreakers: [...values], name: "Flush" };
  }

  if (isStraight) {
    return { category: 4, tiebreakers: [straightHigh], name: "Straight" };
  }

  if (entries[0].count === 3) {
    const trips = entries[0].value;
    const kickers = entries.slice(1).map(e => e.value).sort((a, b) => b - a);
    return { category: 3, tiebreakers: [trips, ...kickers], name: "Three of a Kind" };
  }

  if (entries[0].count === 2 && entries[1].count === 2) {
    const highPair = Math.max(entries[0].value, entries[1].value);
    const lowPair = Math.min(entries[0].value, entries[1].value);
    const kicker = entries[2].value;
    return { category: 2, tiebreakers: [highPair, lowPair, kicker], name: "Two Pair" };
  }

  if (entries[0].count === 2) {
    const pair = entries[0].value;
    const kickers = entries.slice(1).map(e => e.value).sort((a, b) => b - a);
    return { category: 1, tiebreakers: [pair, ...kickers], name: "One Pair" };
  }

  return { category: 0, tiebreakers: [...values], name: "High Card" };
}

function compareEvaluations(a, b) {
  if (a.category !== b.category) return a.category - b.category;

  const len = Math.max(a.tiebreakers.length, b.tiebreakers.length);
  for (let i = 0; i < len; i++) {
    const av = a.tiebreakers[i] || 0;
    const bv = b.tiebreakers[i] || 0;
    if (av !== bv) return av - bv;
  }

  return 0;
}

function evaluateBestHand(sevenCards) {
  const allCombos = combinations(sevenCards, 5);
  let best = null;

  for (const combo of allCombos) {
    const evalResult = evaluateFiveCardHand(combo);
    if (!best || compareEvaluations(evalResult, best) > 0) {
      best = evalResult;
    }
  }

  return best;
}

function getVisibleCommunityCards(room) {
  const full = room.communityCards || [];
  const street = room.street || "preflop";

  if (street === "preflop") return [];
  if (street === "flop") return full.slice(0, 3);
  if (street === "turn") return full.slice(0, 4);
  if (street === "river" || street === "showdown") return full.slice(0, 5);
  return [];
}

function getCurrentTurnName(room) {
  const players = room.players || [];
  if (!players.length) return "—";

  const idx = room.currentTurnIndex ?? 0;
  if (idx < 0 || idx >= players.length) return "—";

  return players[idx].name;
}

function advanceTurn(room) {
  const players = room.players || [];
  if (!players.length) return 0;

  let next = room.currentTurnIndex ?? 0;

  for (let i = 0; i < players.length; i++) {
    next = (next + 1) % players.length;
    if (!players[next].folded) {
      return next;
    }
  }

  return next;
}

function allActivePlayersReady(room) {
  const activePlayers = (room.players || []).filter(p => !p.folded);
  if (activePlayers.length <= 1) return true;
  return activePlayers.every(p => p.actedThisStreet);
}

function getRemainingPlayers(room) {
  return (room.players || []).filter(p => !p.folded);
}

function resetStreetActions(room) {
  room.players.forEach(p => {
    if (!p.folded) p.actedThisStreet = false;
  });
}

function getNextStreet(street) {
  if (street === "preflop") return "flop";
  if (street === "flop") return "turn";
  if (street === "turn") return "river";
  if (street === "river") return "showdown";
  return "showdown";
}

function determineWinners(room) {
  const remaining = getRemainingPlayers(room);
  if (remaining.length === 1) {
    return {
      winners: [remaining[0].name],
      handName: "Last Player Standing"
    };
  }

  const visibleBoard = getVisibleCommunityCards({ ...room, street: "showdown" });
  let bestEval = null;
  let winners = [];

  for (const player of remaining) {
    const seven = [...player.hand, ...visibleBoard];
    const evalResult = evaluateBestHand(seven);

    if (!bestEval || compareEvaluations(evalResult, bestEval) > 0) {
      bestEval = evalResult;
      winners = [player.name];
    } else if (compareEvaluations(evalResult, bestEval) === 0) {
      winners.push(player.name);
    }
  }

  return {
    winners,
    handName: bestEval ? bestEval.name : "Unknown"
  };
}

/* =========================
   5) ROOM LOGIC
   ========================= */
async function joinRoom() {
  const playerName = playerNameInput.value.trim();
  const roomCode = roomCodeInput.value.trim().toUpperCase();

  if (!playerName) {
    alert("Enter a player name.");
    return;
  }

  if (!roomCode) {
    alert("Enter a room code or generate one.");
    return;
  }

  currentPlayerName = playerName;
  currentRoomCode = roomCode;

  const roomRef = doc(db, "rooms", roomCode);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    const newRoom = {
      roomCode,
      createdAt: serverTimestamp(),
      status: "Waiting for players...",
      pot: 0,
      street: "preflop",
      currentTurnIndex: 0,
      started: false,
      winnerNames: [],
      winningHandName: "",
      communityCards: [],
      players: [
        {
          name: playerName,
          chips: 1000,
          folded: false,
          hand: [],
          actedThisStreet: false
        }
      ]
    };

    await setDoc(roomRef, newRoom);
  } else {
    const room = roomSnap.data();
    const players = room.players || [];

    if (players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
      alert("That player name is already in this room.");
      return;
    }

    if (players.length >= 6) {
      alert("Room is full (max 6 players).");
      return;
    }

    players.push({
      name: playerName,
      chips: 1000,
      folded: false,
      hand: [],
      actedThisStreet: false
    });

    await updateDoc(roomRef, {
      players,
      status: `${playerName} joined the room.`
    });
  }

  currentRoomText.textContent = `Room: ${roomCode}`;
  statusText.textContent = `Joined room ${roomCode}`;

  subscribeToRoom(roomCode);
}

function subscribeToRoom(roomCode) {
  if (unsubscribeRoom) {
    unsubscribeRoom();
  }

  const roomRef = doc(db, "rooms", roomCode);

  unsubscribeRoom = onSnapshot(roomRef, (snapshot) => {
    if (!snapshot.exists()) {
      statusText.textContent = "Room not found.";
      return;
    }

    const room = snapshot.data();
    renderRoom(room);
  });
}

async function startGame() {
  if (!currentRoomCode) {
    alert("Join a room first.");
    return;
  }

  const roomRef = doc(db, "rooms", currentRoomCode);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) return;

  const room = snap.data();
  const players = room.players || [];

  if (players.length < 2) {
    alert("Need at least 2 players to start.");
    return;
  }

  const deck = createDeck();

  for (const player of players) {
    player.hand = [deck.pop(), deck.pop()];
    player.folded = false;
    player.actedThisStreet = false;
  }

  const communityCards = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];

  await updateDoc(roomRef, {
    players,
    communityCards,
    street: "preflop",
    currentTurnIndex: 0,
    started: true,
    winnerNames: [],
    winningHandName: "",
    status: "Game started! Preflop action.",
    pot: 0
  });
}

async function playerAction(action) {
  if (!currentRoomCode || !currentPlayerName) {
    alert("Join a room first.");
    return;
  }

  const roomRef = doc(db, "rooms", currentRoomCode);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) return;

  const room = snap.data();
  const players = room.players || [];
  const playerIndex = players.findIndex(p => p.name === currentPlayerName);

  if (playerIndex === -1) return;

  if (!room.started) {
    alert("Game hasn't started.");
    return;
  }

  if (room.street === "showdown") {
    alert("Hand is over. Start a new game.");
    return;
  }

  if (room.currentTurnIndex !== playerIndex) {
    alert("Not your turn.");
    return;
  }

  const player = players[playerIndex];

  if (player.folded) {
    alert("You're folded.");
    return;
  }

  if (action === "fold") {
    player.folded = true;
    player.actedThisStreet = true;
  } else {
    player.actedThisStreet = true;
  }

  const remaining = getRemainingPlayers(room);

  if (remaining.length <= 1) {
    const result = determineWinners(room);

    await updateDoc(roomRef, {
      players,
      street: "showdown",
      winnerNames: result.winners,
      winningHandName: result.handName,
      status: `${result.winners.join(", ")} wins! (${result.handName})`
    });

    return;
  }

  if (allActivePlayersReady(room)) {
    const nextStreet = getNextStreet(room.street);

    if (nextStreet === "showdown") {
      const result = determineWinners({ ...room, players, street: "showdown" });

      await updateDoc(roomRef, {
        players,
        street: "showdown",
        winnerNames: result.winners,
        winningHandName: result.handName,
        status: `${result.winners.join(", ")} wins! (${result.handName})`
      });

      return;
    }

    resetStreetActions(room);

    await updateDoc(roomRef, {
      players,
      street: nextStreet,
      currentTurnIndex: 0,
      status: `${nextStreet.toUpperCase()} round started.`
    });

    return;
  }

  const nextTurn = advanceTurn(room);

  await updateDoc(roomRef, {
    players,
    currentTurnIndex: nextTurn,
    status: `${currentPlayerName} chose ${action}.`
  });
}

async function nextStreetManual() {
  if (!currentRoomCode) {
    alert("Join a room first.");
    return;
  }

  const roomRef = doc(db, "rooms", currentRoomCode);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) return;

  const room = snap.data();

  if (!room.started) {
    alert("Game hasn't started.");
    return;
  }

  if (room.street === "showdown") {
    alert("Already at showdown.");
    return;
  }

  const nextStreet = getNextStreet(room.street);

  if (nextStreet === "showdown") {
    const result = determineWinners({ ...room, street: "showdown" });

    await updateDoc(roomRef, {
      street: "showdown",
      winnerNames: result.winners,
      winningHandName: result.handName,
      status: `${result.winners.join(", ")} wins! (${result.handName})`
    });

    return;
  }

  const players = room.players || [];
  players.forEach(p => {
    if (!p.folded) p.actedThisStreet = false;
  });

  await updateDoc(roomRef, {
    players,
    street: nextStreet,
    currentTurnIndex: 0,
    status: `${nextStreet.toUpperCase()} round started (manual).`
  });
}

/* =========================
   6) RENDER
   ========================= */
function renderRoom(room) {
  statusText.textContent = room.status || "No status";
  currentRoomText.textContent = `Room: ${room.roomCode || "—"}`;
  potText.textContent = `Pot: ${room.pot ?? 0}`;
  turnText.textContent = `Turn: ${room.street === "showdown" ? "Showdown" : getCurrentTurnName(room)}`;

  renderCommunityCards(getVisibleCommunityCards(room));
  renderMyHand(room);
  renderPlayers(room);
}

function renderCommunityCards(cards) {
  communityCardsDiv.innerHTML = "";

  if (!cards.length) {
    communityCardsDiv.classList.add("empty-state");
    communityCardsDiv.textContent = "No cards yet";
    return;
  }

  communityCardsDiv.classList.remove("empty-state");

  cards.forEach(card => {
    const div = document.createElement("div");
    div.className = "playing-card";
    div.textContent = card;
    communityCardsDiv.appendChild(div);
  });
}

function renderMyHand(room) {
  myHandDiv.innerHTML = "";

  const me = (room.players || []).find(p => p.name === currentPlayerName);

  if (!me) {
    myHandDiv.classList.add("empty-state");
    myHandDiv.textContent = "Join a room first";
    myHandRankText.textContent = "Hand Rank: —";
    return;
  }

  if (!me.hand || !me.hand.length) {
    myHandDiv.classList.add("empty-state");
    myHandDiv.textContent = "No cards yet";
    myHandRankText.textContent = "Hand Rank: —";
    return;
  }

  myHandDiv.classList.remove("empty-state");

  me.hand.forEach(card => {
    const div = document.createElement("div");
    div.className = "playing-card";
    div.textContent = card;
    myHandDiv.appendChild(div);
  });

  const visibleBoard = getVisibleCommunityCards(room);

  if (visibleBoard.length + me.hand.length >= 5) {
    const result = evaluateBestHand([...me.hand, ...visibleBoard]);
    myHandRankText.textContent = `Hand Rank: ${result.name}`;
  } else {
    myHandRankText.textContent = "Hand Rank: Not enough cards yet";
  }
}

function renderPlayers(room) {
  playersListDiv.innerHTML = "";

  const players = room.players || [];

  if (!players.length) {
    playersListDiv.classList.add("empty-state");
    playersListDiv.textContent = "No players yet";
    return;
  }

  playersListDiv.classList.remove("empty-state");

  players.forEach((player, index) => {
    const playerDiv = document.createElement("div");
    playerDiv.className = "player-card";

    if (room.street !== "showdown" && index === room.currentTurnIndex && !player.folded) {
      playerDiv.classList.add("active-turn");
    }

    if (player.folded) {
      playerDiv.classList.add("folded-player");
    }

    if ((room.winnerNames || []).includes(player.name)) {
      playerDiv.classList.add("winner");
    }

    const title = document.createElement("h3");
    title.textContent = player.name + (player.name === currentPlayerName ? " (You)" : "");
    playerDiv.appendChild(title);

    const chips = document.createElement("div");
    chips.className = "player-meta";
    chips.textContent = `Chips: ${player.chips}`;
    playerDiv.appendChild(chips);

    const folded = document.createElement("div");
    folded.className = "player-meta";
    folded.textContent = `Folded: ${player.folded ? "Yes" : "No"}`;
    playerDiv.appendChild(folded);

    const acted = document.createElement("div");
    acted.className = "player-meta";
    acted.textContent = `Acted This Street: ${player.actedThisStreet ? "Yes" : "No"}`;
    playerDiv.appendChild(acted);

    const handTitle = document.createElement("div");
    handTitle.className = "player-meta";
    handTitle.textContent = "Cards:";
    playerDiv.appendChild(handTitle);

    const handDiv = document.createElement("div");
    handDiv.className = "player-hand";

    const canReveal =
      player.name === currentPlayerName ||
      room.street === "showdown";

    if (player.hand && player.hand.length) {
      if (canReveal) {
        player.hand.forEach(card => {
          const mini = document.createElement("div");
          mini.className = "mini-card";
          mini.textContent = card;
          handDiv.appendChild(mini);
        });
      } else {
        for (let i = 0; i < player.hand.length; i++) {
          const mini = document.createElement("div");
          mini.className = "mini-card";
          mini.textContent = "🂠";
          handDiv.appendChild(mini);
        }
      }
    } else {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No cards";
      handDiv.appendChild(empty);
    }

    playerDiv.appendChild(handDiv);
    playersListDiv.appendChild(playerDiv);
  });
}

/* =========================
   7) EVENTS
   ========================= */
randomRoomBtn.addEventListener("click", () => {
  roomCodeInput.value = generateRoomCode();
});

joinBtn.addEventListener("click", joinRoom);
startBtn.addEventListener("click", startGame);

checkBtn.addEventListener("click", () => playerAction("check"));
callBtn.addEventListener("click", () => playerAction("call"));
foldBtn.addEventListener("click", () => playerAction("fold"));

nextStreetBtn.addEventListener("click", nextStreetManual);
