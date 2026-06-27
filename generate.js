const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'russian.txt');
const outputPath = path.join(__dirname, 'words.js');

function parseRussianTxt(rawData) {
    const allWords = rawData.split(/\r?\n/);
    const filtered = [];
    for (let word of allWords) {
        if (!word) continue;
        let clean = word.replace(/[\s\x00-\x1F\x7F-\x9F\xAD]/g, '').toLowerCase().replace(/[^а-яё]/g, '');
        if (clean.length === 5) filtered.push(clean);
    }
    return [...new Set(filtered)].sort();
}

try {
    console.log('Шаг 1: Анализируем локальный файл russian.txt...');
    let data = fs.readFileSync(inputPath, 'utf-8');
    let all5LetterWords = parseRussianTxt(data);

    if (all5LetterWords.length === 0) {
        console.log('Переключаю кодировку на Windows-1251...');
        const buffer = fs.readFileSync(inputPath);
        data = new TextDecoder('windows-1251').decode(buffer);
        all5LetterWords = parseRussianTxt(data);
    }

    console.log('Шаг 2: Формируем финальный файл со словами...');

    const fileContent = `// Все слова для проверки ввода и загадывания (26490 слов)
const WORDLE_DICTIONARY = ${JSON.stringify(all5LetterWords, null, 2)};

// Мощная база из всех доступных пятибуквенных слов
const WORDLE_SECRET_WORDS = ${JSON.stringify(all5LetterWords, null, 2)};

// Экспорт для Node.js бэкенда
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WORDLE_SECRET_WORDS };
}
`;

    fs.writeFileSync(outputPath, fileContent, 'utf-8');

    console.log(`\n===================================`);
    console.log(` СЛОВАРЬ ИДЕАЛЬНО НАСТРОЕН!`);
    console.log(`Всего чистых слов из 5 букв: ${all5LetterWords.length}`);
    console.log(`===================================`);
    console.log(`Примеры загадок: ${all5LetterWords.slice(100, 105).join(', ')}`);

} catch (e) {
    console.error('Ошибка:', e.message);
}