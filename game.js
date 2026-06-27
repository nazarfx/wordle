const socket = io('https://wordle-4efr.onrender.com');
let currentRoomId = null;

const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 5;
let currentRow, currentTile, guesses, gameOver, keyStates;

const board = document.getElementById("game-board");
const keyboard = document.getElementById("keyboard");
const messageEl = document.getElementById("message");
const restartBtn = document.getElementById("restart-btn");
const themeToggle = document.getElementById("theme-toggle");

const KEYBOARD_LAYOUT = [
    ["й", "ц", "у", "к", "е", "н", "г", "ш", "щ", "з", "х", "ъ"],
    ["ф", "ы", "в", "а", "п", "р", "о", "л", "д", "ж", "э"],
    ["enter", "я", "ч", "с", "м", "и", "т", "ь", "б", "ю", "back"]
];

document.getElementById('create-room-btn').addEventListener('click', () => {
    socket.emit('createRoom');
});

document.getElementById('join-room-btn').addEventListener('click', () => {
    const code = document.getElementById('room-input').value.trim();
    if (code) {
        socket.emit('joinRoom', code);
    } else {
        showMessage("Введите код комнаты");
    }
});

socket.on('roomCreated', ({ roomId }) => {
    currentRoomId = roomId;
    document.getElementById('room-info').textContent = `Ваша комната: ${roomId}. Отправьте этот код друзьям!`;
    resetGameLocal();
});

socket.on('roomUpdated', ({ roomId, players }) => {
    currentRoomId = roomId;
    document.getElementById('room-info').textContent = `Комната: ${roomId} | Игроков: ${Object.keys(players).length}`;
    updateOpponentsBoards(players);
});

socket.on('error', (msg) => {
    showMessage(msg);
});

if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-mode");
    themeToggle.textContent = "🌙";
}

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    const isLight = document.body.classList.contains("light-mode");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    themeToggle.textContent = isLight ? "🌙" : "☀️";
});

document.addEventListener("keydown", (e) => {
    if (gameOver) return;
    const key = e.key.toLowerCase();
    if (key === "enter") handleKeyPress("enter");
    else if (key === "backspace") handleKeyPress("back");
    else if (/^[а-яё]$/.test(key)) handleKeyPress(key.replace("ё", "е"));
});

function resetGameLocal() {
    currentRow = 0;
    currentTile = 0;
    gameOver = false;
    guesses = Array(MAX_ATTEMPTS).fill("").map(() => Array(WORD_LENGTH).fill(""));
    keyStates = {};

    board.innerHTML = "";
    keyboard.innerHTML = "";
    messageEl.style.display = "none";
    restartBtn.style.display = "none";

    createBoard();
    createKeyboard();
}

function createBoard() {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        const row = document.createElement("div");
        row.className = "row";
        for (let j = 0; j < WORD_LENGTH; j++) {
            const tile = document.createElement("div");
            tile.className = "tile";
            tile.id = `tile-${i}-${j}`;
            row.appendChild(tile);
        }
        board.appendChild(row);
    }
}

function createKeyboard() {
    KEYBOARD_LAYOUT.forEach(rowPattern => {
        const row = document.createElement("div");
        row.className = "keyboard-row";
        rowPattern.forEach(keyText => {
            const button = document.createElement("button");
            button.textContent = keyText;
            button.className = "key";
            button.id = `key-${keyText.toLowerCase()}`;
            if (keyText === "enter" || keyText === "back") button.classList.add("large");
            button.addEventListener("click", () => handleKeyPress(keyText.toLowerCase()));
            row.appendChild(button);
        });
        keyboard.appendChild(row);
    });
}

function updateKeyboardColors() {
    for (const letter in keyStates) {
        const keyBtn = document.getElementById(`key-${letter}`);
        if (keyBtn) {
            keyBtn.setAttribute("data-state", keyStates[letter]);
        }
    }
}

function showMessage(text, duration = 2000) {
    messageEl.textContent = text;
    messageEl.style.display = "block";
    if (duration > 0) setTimeout(() => messageEl.style.display = "none", duration);
}

function handleKeyPress(key) {
    if (gameOver) return;

    if (key === "back") {
        if (currentTile > 0) {
            currentTile--;
            guesses[currentRow][currentTile] = "";
            const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
            tile.textContent = "";
            tile.removeAttribute("data-state");
        }
    } else if (key === "enter") {
        if (currentTile === WORD_LENGTH) checkRow();
        else showMessage("Недостаточно букв");
    } else if (/^[а-я]$/.test(key)) {
        if (currentTile < WORD_LENGTH) {
            guesses[currentRow][currentTile] = key;
            const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
            tile.textContent = key;
            tile.setAttribute("data-state", "tbd");
            tile.classList.add('pop');
            setTimeout(() => tile.classList.remove('pop'), 100);
            currentTile++;
        }
    }
}

function checkRow() {
    if (!currentRoomId) {
        showMessage("Сначала создайте комнату или войдите к другу!");
        return;
    }
    const guess = guesses[currentRow].join("");
    socket.emit('submitGuess', { roomId: currentRoomId, guess });
}

socket.on('invalidWord', () => {
    showMessage("Такого слова нет");
    const rowEl = document.querySelectorAll('.row')[currentRow];
    rowEl.classList.add('shake');
    setTimeout(() => rowEl.classList.remove('shake'), 500);
});

socket.on('guessResult', ({ statuses, isWon, isLost, secretWord }) => {
    const guessLetters = guesses[currentRow];

    guessLetters.forEach((letter, i) => {
        const tile = document.getElementById(`tile-${currentRow}-${i}`);

        if (statuses[i] !== "correct") {
            if (keyStates[letter] !== "correct") keyStates[letter] = statuses[i];
        } else {
            keyStates[letter] = "correct";
        }

        setTimeout(() => {
            tile.classList.add('flip');
            tile.setAttribute("data-state", statuses[i]);
            updateKeyboardColors();
        }, i * 200);
    });

    if (isWon) {
        gameOver = true;
        for (let i = 0; i < WORD_LENGTH; i++) {
            setTimeout(() => document.getElementById(`tile-${currentRow}-${i}`).classList.add('jump'), i * 150);
        }
        setTimeout(() => { showMessage("Победа! 🎉", 0); restartBtn.style.display = "block"; }, 1200);
    } else if (isLost) {
        gameOver = true;
        setTimeout(() => { showMessage(`Игра окончена. Слово: ${secretWord.toUpperCase()}`, 0); restartBtn.style.display = "block"; }, 1200);
    } else {
        currentRow++;
        currentTile = 0;
    }
});

function updateOpponentsBoards(players) {
    const container = document.getElementById("opponents-containers");
    container.innerHTML = ""; // Очищаем старые мини-сетки

    for (const id in players) {
        if (id === socket.id) continue;

        const player = players[id];

        const opponentDiv = document.createElement("div");
        opponentDiv.className = "opponent-board-wrapper";
        opponentDiv.style.display = "flex";
        opponentDiv.style.flexDirection = "column";
        opponentDiv.style.alignItems = "center";

        const title = document.createElement("div");
        title.style.fontSize = "0.8rem";
        title.style.marginBottom = "5px";
        title.style.color = "#818384";

        if (player.score === 'won') title.textContent = "Друг (Победил! 🎉)";
        else if (player.score === 'lost') title.textContent = "Друг (Проиграл ❌)";
        else title.textContent = `Друг (${player.currentAttempt}/6)`;

        opponentDiv.appendChild(title);

        const miniBoard = document.createElement("div");
        miniBoard.style.display = "grid";
        miniBoard.style.gridTemplateRows = "repeat(6, 1fr)";
        miniBoard.style.gridGap = "3px";

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            const row = document.createElement("div");
            row.style.display = "grid";
            row.style.gridTemplateColumns = "repeat(5, 1fr)";
            row.style.gridGap = "3px";

            for (let j = 0; j < WORD_LENGTH; j++) {
                const miniTile = document.createElement("div");
                miniTile.style.width = "15px";
                miniTile.style.height = "15px";
                miniTile.style.border = "1px solid #3a3a3c";

                if (player.progress[i] && player.progress[i][j]) {
                    const state = player.progress[i][j];
                    if (state === "correct") miniTile.style.backgroundColor = "#538d4e";
                    else if (state === "present") miniTile.style.backgroundColor = "#b59f3b";
                    else if (state === "absent") miniTile.style.backgroundColor = "#3a3a3c";
                    miniTile.style.borderColor = "transparent";
                }
                row.appendChild(miniTile);
            }
            miniBoard.appendChild(row);
        }

        opponentDiv.appendChild(miniBoard);
        container.appendChild(opponentDiv);
    }
}

restartBtn.addEventListener("click", () => {
    socket.emit('createRoom');
});

resetGameLocal();

