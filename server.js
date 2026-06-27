const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');

// Настройка CORS, чтобы браузер (даже запущенный из WebStorm) мог подключаться к порту 3000
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// Импортируем массив секретных слов для загадывания из server_words.js
const { WORDLE_SECRET_WORDS } = require('./server_words.js');

// Хранилище активных игровых комнат
const rooms = {};

io.on('connection', (socket) => {
    console.log(`Пользователь подключился: ${socket.id}`);

    // --- 1. СОЗДАНИЕ КОМНАТЫ ---
    socket.on('createRoom', () => {
        // Генерируем случайный короткий код комнаты из 4 символов
        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();

        // Выбираем случайное слово из списка
        const randomWord = WORDLE_SECRET_WORDS[Math.floor(Math.random() * WORDLE_SECRET_WORDS.length)];
        const secretWord = randomWord.toLowerCase().replace(/ё/g, 'е');

        rooms[roomId] = {
            secretWord: secretWord,
            players: {}
        };

        socket.join(roomId);

        // Инициализируем данные создателя комнаты
        rooms[roomId].players[socket.id] = {
            id: socket.id,
            progress: [],
            currentAttempt: 0,
            score: 'playing'
        };

        // Отправляем ID комнаты обратно создателю
        socket.emit('roomCreated', { roomId });
    });

    // --- 2. ПОДКЛЮЧЕНИЕ К КОМНАТЕ ДРУГА ---
    socket.on('joinRoom', (roomId) => {
        roomId = roomId.toUpperCase().trim();

        if (rooms[roomId]) {
            socket.join(roomId);

            // Инициализируем данные нового игрока
            rooms[roomId].players[socket.id] = {
                id: socket.id,
                progress: [],
                currentAttempt: 0,
                score: 'playing'
            };

            // Рассылаем обновленное состояние комнаты всем её участникам
            io.to(roomId).emit('roomUpdated', {
                roomId,
                players: rooms[roomId].players
            });
        } else {
            socket.emit('error', 'Комната не найдена! Проверьте код.');
        }
    });

    // --- 3. ОБРАБОТКА ВВЕДЕННОГО СЛОВА ---
    socket.on('submitGuess', ({ roomId, guess }) => {
        const room = rooms[roomId];
        if (!room) return;

        const guessClean = guess.toLowerCase().replace(/ё/g, 'е');

        // Алгоритм подсчета цветов (как в твоем оригинальном Wordle)
        const secretLetters = room.secretWord.split("");
        const guessLetters = guessClean.split("");
        const statuses = Array(5).fill("absent");

        // Первый проход: ищем точные совпадения (зеленые плитки)
        for (let i = 0; i < 5; i++) {
            if (guessLetters[i] === secretLetters[i]) {
                statuses[i] = "correct";
                secretLetters[i] = null;
            }
        }

        // Второй проход: ищем буквы в других местах (желтые плитки)
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

        // Сохраняем прогресс игрока на сервере для отправки соперникам
        player.progress.push(statuses);
        player.currentAttempt++;

        // Проверяем статус игры для этого игрока
        if (guessClean === room.secretWord) {
            player.score = 'won';
        } else if (player.currentAttempt >= 6) {
            player.score = 'lost';
        }

        // Отправляем результат проверки лично игроку, который ходил
        socket.emit('guessResult', {
            statuses,
            isWon: player.score === 'won',
            isLost: player.score === 'lost',
            secretWord: room.secretWord
        });

        // Отправляем обновленные превью-сетки всем остальным в комнате
        io.to(roomId).emit('roomUpdated', { roomId, players: room.players });
    });

    // --- 4. ОТКЛЮЧЕНИЕ ИГРОКА ---
    socket.on('disconnect', () => {
        console.log(`Пользователь отключился: ${socket.id}`);

        // Чистим игрока из комнат, если он вышел
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                delete rooms[roomId].players[socket.id];

                // Если в комнате никого не осталось — удаляем комнату целиком
                if (Object.keys(rooms[roomId].players).length === 0) {
                    delete rooms[roomId];
                } else {
                    // Иначе уведомляем оставшихся друзей, что игрок ушел
                    io.to(roomId).emit('roomUpdated', { roomId, players: rooms[roomId].players });
                }
            }
        }
    });
});

// Render сам передаст нужный порт в process.env.PORT
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`=== СЕРВЕР МУЛЬТИПЛЕЕРА УСПЕШНО ЗАПУЩЕН ===`);
    console.log(`Слушаю порт: ${PORT}`);
});