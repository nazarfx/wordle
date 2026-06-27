const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'russian.txt');
const outputPath = path.join(__dirname, 'words.js');

try {
    const data = fs.readFileSync(inputPath, 'utf-8');
    const allWords = data.split(/\r?\n/);

    console.log(`Всего строк в исходном файле: ${allWords.length}`);

    // Посмотрим на первые 5 строк из файла, чтобы понять, в каком они виде
    console.log("Первые 5 строк для теста:", JSON.stringify(allWords.slice(0, 5)));

    const all5LetterWords = [];

    for (let word of allWords) {
        // Убираем любые скрытые пробельные символы по бокам
        let cleanWord = word.replace(/\s+/g, '').toLowerCase().replace(/ё/g, 'е');

        // Оставляем только длину 5 (без жесткой проверки регуляркой)
        if (cleanWord.length === 5) {
            all5LetterWords.push(cleanWord);
        }
    }

    const uniqueWords = [...new Set(all5LetterWords)];

    const fileContent = `const WORDLE_DICTIONARY = ${JSON.stringify(uniqueWords)};\nconst WORDLE_SECRET_WORDS = WORDLE_DICTIONARY;\n`;

    fs.writeFileSync(outputPath, fileContent, 'utf-8');
    console.log(`===================================`);
    console.log(` УСПЕШНО СОЗДАНО СЛОВ: ${uniqueWords.length}`);
    console.log(`===================================`);

} catch (err) {
    console.error("Ошибка при генерации:", err);
}