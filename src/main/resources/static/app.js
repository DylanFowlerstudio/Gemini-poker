let stompClient = null;
let currentRoomCode = "";
let currentPlayerName = "";
let currentSubscription = null;

const playerNameInput = document.getElementById("playerName");
const roomCodeInput = document.getElementById("roomCode");

const joinBtn = document.getElementById("joinBtn");
const startBtn = document.getElementById("startBtn");
const randomRoomBtn = document.getElementById("randomRoomBtn");

const checkBtn = document.getElementById("checkBtn");
const callBtn = document.getElementById("callBtn");
const foldBtn = document.getElementById("foldBtn");

const statusText = document.getElementById("statusText");
const currentRoomText = document.getElementById("currentRoom");
const communityCardsDiv = document.getElementById("communityCards");
const playersListDiv = document.getElementById("playersList");

function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";

    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
}

function connectIfNeeded(callback) {
    if (stompClient && stompClient.connected) {
        callback();
        return;
    }

    const socket = new SockJS("/poker");
    stompClient = Stomp.over(socket);

    stompClient.connect({}, function () {
        statusText.textContent = "Connected to server.";
        callback();
    }, function (error) {
        console.error("WebSocket error:", error);
        statusText.textContent = "Connection failed.";
    });
}

function subscribeToRoom(roomCode) {
    if (!stompClient || !stompClient.connected) return;

    if (currentSubscription) {
        currentSubscription.unsubscribe();
    }

    currentSubscription = stompClient.subscribe("/topic/room/" + roomCode, function (message) {
        const data = JSON.parse(message.body);
        renderGameState(data);
    });
}

function joinRoom() {
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

    connectIfNeeded(function () {
        subscribeToRoom(roomCode);

        stompClient.send("/app/join", {}, JSON.stringify({
            roomCode: roomCode,
            playerName: playerName
        }));

        currentRoomText.textContent = "Room: " + roomCode;
        statusText.textContent = "Joining room " + roomCode + "...";
    });
}

function startGame() {
    if (!stompClient || !stompClient.connected) {
        alert("Join a room first.");
        return;
    }

    if (!currentRoomCode) {
        alert("No room selected.");
        return;
    }

    stompClient.send("/app/start", {}, JSON.stringify({
        roomCode: currentRoomCode
    }));
}

function sendAction(action) {
    if (!stompClient || !stompClient.connected) {
        alert("Join a room first.");
        return;
    }

    if (!currentRoomCode || !currentPlayerName) {
        alert("Missing room or player info.");
        return;
    }

    stompClient.send("/app/action", {}, JSON.stringify({
        roomCode: currentRoomCode,
        playerName: currentPlayerName,
        action: action
    }));
}

function renderGameState(data) {
    statusText.textContent = data.status || "No status";
    currentRoomText.textContent = "Room: " + (data.roomCode || "—");

    renderCommunityCards(data.communityCards || []);
    renderPlayers(data.players || []);
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
        const cardDiv = document.createElement("div");
        cardDiv.className = "playing-card";
        cardDiv.textContent = card;
        communityCardsDiv.appendChild(cardDiv);
    });
}

function renderPlayers(players) {
    playersListDiv.innerHTML = "";

    if (!players.length) {
        playersListDiv.classList.add("empty-state");
        playersListDiv.textContent = "No players yet";
        return;
    }

    playersListDiv.classList.remove("empty-state");

    players.forEach(player => {
        const playerDiv = document.createElement("div");
        playerDiv.className = "player-card";

        const title = document.createElement("h3");
        title.textContent = player.name + (player.name === currentPlayerName ? " (You)" : "");
        playerDiv.appendChild(title);

        const chips = document.createElement("div");
        chips.className = "player-meta";
        chips.textContent = "Chips: " + player.chips;
        playerDiv.appendChild(chips);

        const folded = document.createElement("div");
        folded.className = "player-meta";
        folded.textContent = "Folded: " + (player.folded ? "Yes" : "No");
        playerDiv.appendChild(folded);

        const handSize = document.createElement("div");
        handSize.className = "player-meta";
        handSize.textContent = "Hand Size: " + player.handSize;
        playerDiv.appendChild(handSize);

        const handTitle = document.createElement("div");
        handTitle.className = "player-meta";
        handTitle.textContent = "Hand:";
        playerDiv.appendChild(handTitle);

        const handDiv = document.createElement("div");
        handDiv.className = "player-hand";

        if (player.hand && player.hand.length) {
            player.hand.forEach(card => {
                const miniCard = document.createElement("div");
                miniCard.className = "mini-card";
                miniCard.textContent = card;
                handDiv.appendChild(miniCard);
            });
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

randomRoomBtn.addEventListener("click", function () {
    roomCodeInput.value = generateRoomCode();
});

joinBtn.addEventListener("click", joinRoom);
startBtn.addEventListener("click", startGame);

checkBtn.addEventListener("click", function () {
    sendAction("check");
});

callBtn.addEventListener("click", function () {
    sendAction("call");
});

foldBtn.addEventListener("click", function () {
    sendAction("fold");
});
