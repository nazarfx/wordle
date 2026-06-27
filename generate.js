const fs = require('fs');
const path = require('path');
const words = require('russian-words'); // Подключаем правильный пакет

const outputPath = path.join(__dirname, 'words.js');

try {
    console.log(`Всего слов в пакете: ${words.length}`);

    const fiveLetterWords = words
        .map(word => word.trim().toLowerCase().replace(/ё/g, 'е'))
        .filter(word => word.length === 5 && /^[а-я]+$/.test(word));

    const uniqueWords = [...new Set(fiveLetterWords)];

    const fileContent = `const WORDLE_DICTIONARY = ${JSON.stringify(uniqueWords)};\nconst WORDLE_SECRET_WORDS = WORDLE_DICTIONARY;\n`;

    fs.writeFileSync(outputPath, fileContent, 'utf-8');
    console.log(`===================================`);
    console.log(` УСПЕШНО СОЗДАНО СЛОВ: ${uniqueWords.length}`);
    console.log(`===================================`);

} catch (err) {
    console.error("Ошибка:", err);
}
