const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const rooms = {};

io.on('connection', (socket) => {
    console.log(`Пользователь подключился: ${socket.id}`);

    socket.on('createRoom', (data) => {
        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();

        // Если фронтенд передал слово, берем его. Если нет — используем дефолтную заглушку
        let secretWord = (data && data.secretWord) ? data.secretWord : "столб";
        secretWord = secretWord.toLowerCase().replace(/ё/g, 'е');

        rooms[roomId] = {
            secretWord: secretWord,
            players: {}
        };

        socket.join(roomId);
        rooms[roomId].players[socket.id] = { id: socket.id, progress: [], currentAttempt: 0, score: 'playing' };
        socket.emit('roomCreated', { roomId });
        console.log(`[КОМНАТА ${roomId}] Создана. Загаданное слово: ${secretWord}`);
    });

    socket.on('joinRoom', (roomId) => {
        roomId = roomId.toUpperCase().trim();
        if (rooms[roomId]) {
            socket.join(roomId);
            rooms[roomId].players[socket.id] = { id: socket.id, progress: [], currentAttempt: 0, score: 'playing' };
            io.to(roomId).emit('roomUpdated', { roomId, players: rooms[roomId].players });
        } else {
            socket.emit('error', 'Комната не найдена!');
        }
    });

    socket.on('submitGuess', ({ roomId, guess }) => {
        const room = rooms[roomId];
        if (!room) return;

        const guessClean = guess.toLowerCase();
        const secretLetters = room.secretWord.split("");
        const guessLetters = guessClean.split("");
        const statuses = Array(5).fill("absent");

        for (let i = 0; i < 5; i++) {
            if (guessLetters[i] === secretLetters[i]) {
                statuses[i] = "correct";
                secretLetters[i] = null;
            }
        }

        for (let i = 0; i < 5; i++) {
            if (statuses[i] === "correct") continue;
            const index = secretLetters.indexOf(guessLetters[i]);
            if (index !== -1) {
                statuses[i] = "present";
                secretLetters[index] = null;
            }
        }

        const player = room.players[socket.id];
        if (!player) return;

        player.progress.push(statuses);
        player.currentAttempt++;

        if (guessClean === room.secretWord) {
            player.score = 'won';
        } else if (player.currentAttempt >= 6) {
            player.score = 'lost';
        }

        socket.emit('guessResult', {
            statuses,
            isWon: player.score === 'won',
            isLost: player.score === 'lost',
            secretWord: room.secretWord
        });

        io.to(roomId).emit('roomUpdated', { roomId, players: room.players });
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                delete rooms[roomId].players[socket.id];
                if (Object.keys(rooms[roomId].players).length === 0) {
                    delete rooms[roomId];
                } else {
                    io.to(roomId).emit('roomUpdated', { roomId, players: rooms[roomId].players });
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту: ${PORT}`);
});