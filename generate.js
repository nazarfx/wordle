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
    console.log('Шаг 1: Анализируем твой локальный файл russian.txt...');
    let data = fs.readFileSync(inputPath, 'utf-8');
    let all5LetterWords = parseRussianTxt(data);

    if (all5LetterWords.length === 0) {
        console.log('Переключаю кодировку на Windows-1251...');
        const buffer = fs.readFileSync(inputPath);
        data = new TextDecoder('windows-1251').decode(buffer);
        all5LetterWords = parseRussianTxt(data);
    }

    console.log('Шаг 2: Кросс-чекинг с ультимативной базой из 1000 существительных...');

    // Оставляем только то, что на 100% совпало с твоим файлом
    const finalSecretWords = FINAL_1000_WORDS.map(w => w.toLowerCase().replace(/ё/g, 'е')).filter(w => {
        return all5LetterWords.some(orig => orig.replace(/ё/g, 'е') === w);
    });

    const fileContent = `// Все слова для проверки ввода (26490 слов)
const WORDLE_DICTIONARY = ${JSON.stringify(all5LetterWords, null, 2)};

// Мощная база из чистых пятибуквенных существительных для загадывания
const WORDLE_SECRET_WORDS = ${JSON.stringify(finalSecretWords, null, 2)};
`;

    fs.writeFileSync(outputPath, fileContent, 'utf-8');

    console.log(`\n===================================`);
    console.log(` СЛОВАРЬ ИДЕАЛЬНО НАСТРОЕН!`);
    console.log(`Всего слов для проверки ввода: ${all5LetterWords.length}`);
    console.log(`Всего Чистых Слов Для Загадывания: ${finalSecretWords.length}`);
    console.log(`===================================`);
    console.log(`Примеры новых загадок: ${finalSecretWords.slice(400, 406).join(', ')}`);

} catch (e) {
    console.error('Ошибка:', e.message);
}


// const fs = require('fs');
// const path = require('path');
//
// const inputPath = path.join(__dirname, 'russian.txt');
// const outputPath = path.join(__dirname, 'words.js');
//
// try {
//     console.log('Читаем russian.txt и лечим кодировку Mac/Windows...');
//     let data = fs.readFileSync(inputPath, 'utf-8');
//
//     // Хак против UTF-16: вырезаем невидимые нулевые байты, если они есть
//     data = data.replace(/\0/g, '');
//
//     const allLines = data.split(/[\r\n]+/);
//     console.log(`Всего строк после очистки кодировки: ${allLines.length}`);
//
//     const validWords = [];
//
//     for (let line of allLines) {
//         // Очищаем от любых скрытых символов, оставляем ТОЛЬКО буквы
//         let word = line.trim().toLowerCase();
//
//         // Оставляем в строке только русские буквы (выкидываем скрытый мусор)
//         word = word.replace(/[^а-яё]/g, '');
//         word = word.replace(/ё/g, 'е');
//
//         // Вот теперь проверяем длину
//         if (word.length === 5) {
//             validWords.push(word);
//         }
//     }
//
//     const uniqueWords = [...new Set(validWords)];
//
//     const fileContent = `// Массив для валидации (все чистые слова из 5 букв)
// const WORDLE_DICTIONARY = ${JSON.stringify(uniqueWords)};
//
// // Массив для загадывания (тот же самый)
// const WORDLE_SECRET_WORDS = WORDLE_DICTIONARY;
// `;
//
//     fs.writeFileSync(outputPath, fileContent, 'utf-8');
//     console.log(`===================================`);
//     console.log(` СЛОВАРЬ ИДЕАЛЬНО НАСТРОЕН!`);
//     console.log(` Всего чистых слов из 5 букв: ${uniqueWords.length}`);
//     console.log(`===================================`);
//     if (uniqueWords.length > 0) {
//         console.log(`Примеры слов: ${uniqueWords.slice(0, 5).join(', ')}`);
//     }
//
// } catch (err) {
//     console.error("Ошибка при генерации словаря:", err);
// }
//
// // const fs = require('fs');
// // const path = require('path');
// //
// // const inputPath = path.join(__dirname, 'russian.txt');
// // const outputPath = path.join(__dirname, 'words.js');
// //
// // try {
// //     console.log('Читаем russian.txt...');
// //     const data = fs.readFileSync(inputPath, 'utf-8');
// //
// //     // Разбиваем по всем возможным переносам строк (\n, \r)
// //     const allLines = data.split(/[\r\n]+/);
// //     console.log(`Всего строк в исходном файле: ${allLines.length}`);
// //
// //     const validWords = [];
// //
// //     for (let line of allLines) {
// //         // Очищаем слово от пробелов и скрытых символов, переводим в нижний регистр
// //         let word = line.trim().toLowerCase();
// //
// //         // Заменяем ё на е
// //         word = word.replace(/ё/g, 'e');
// //
// //         // Проверяем длину (ровно 5 букв)
// //         if (word.length === 5) {
// //             // Проверяем, что это русское слово (буквы от 'а' до 'я')
// //             if (/^[а-я]+$/.test(word)) {
// //                 validWords.push(word);
// //             }
// //         }
// //     }
// //
// //     // Убираем дубликаты
// //     const uniqueWords = [...new Set(validWords)];
// //
// //     if (uniqueWords.length === 0) {
// //         console.log('!!! ВНИМАНИЕ: Словарь пуст. Пробуем упрощенный поиск без регулярных выражений...');
// //         // Запасной план, если регулярка совсем не хочет работать на этой кодировке
// //         for (let line of allLines) {
// //             let word = line.trim().toLowerCase().replace(/[^а-яё]/g, ''); // вырезаем только русские буквы
// //             if (word.length === 5) {
// //                 validWords.push(word.replace(/ё/g, 'е'));
// //             }
// //         }
// //     }
// //
// //     const finalWords = [...new Set(validWords)];
// //
// //     const fileContent = `// Массив для валидации (все чистые слова из 5 букв)
// // const WORDLE_DICTIONARY = ${JSON.stringify(finalWords)};
// //
// // // Массив для загадывания (тот же самый)
// // const WORDLE_SECRET_WORDS = WORDLE_DICTIONARY;
// // `;
// //
// //     fs.writeFileSync(outputPath, fileContent, 'utf-8');
// //     console.log(`===================================`);
// //     console.log(` СЛОВАРЬ ИДЕАЛЬНО НАСТРОЕН!`);
// //     console.log(` Всего чистых слов из 5 букв: ${finalWords.length}`);
// //     console.log(`===================================`);
// //     if (finalWords.length > 0) {
// //         console.log(`Примеры слов: ${finalWords.slice(0, 5).join(', ')}`);
// //     }
// //
// // } catch (err) {
// //     console.error("Ошибка при генерации словаря:", err);
// // }
// //
// //
// // // const fs = require('fs');
// // // const path = require('path');
// // //
// // // const inputPath = path.join(__dirname, 'russian.txt');
// // // const outputPath = path.join(__dirname, 'words.js');
// // //
// // // try {
// // //     const data = fs.readFileSync(inputPath, 'utf-8');
// // //     const allWords = data.split(/\r?\n/);
// // //
// // //     console.log(`Всего строк в исходном файле: ${allWords.length}`);
// // //
// // //     // Посмотрим на первые 5 строк из файла, чтобы понять, в каком они виде
// // //     console.log("Первые 5 строк для теста:", JSON.stringify(allWords.slice(0, 5)));
// // //
// // //     const all5LetterWords = [];
// // //
// // //     for (let word of allWords) {
// // //         // Убираем любые скрытые пробельные символы по бокам
// // //         let cleanWord = word.replace(/\s+/g, '').toLowerCase().replace(/ё/g, 'е');
// // //
// // //         // Оставляем только длину 5 (без жесткой проверки регуляркой)
// // //         if (cleanWord.length === 5) {
// // //             all5LetterWords.push(cleanWord);
// // //         }
// // //     }
// // //
// // //     const uniqueWords = [...new Set(all5LetterWords)];
// // //
// // //     const fileContent = `const WORDLE_DICTIONARY = ${JSON.stringify(uniqueWords)};\nconst WORDLE_SECRET_WORDS = WORDLE_DICTIONARY;\n`;
// // //
// // //     fs.writeFileSync(outputPath, fileContent, 'utf-8');
// // //     console.log(`===================================`);
// // //     console.log(` УСПЕШНО СОЗДАНО СЛОВ: ${uniqueWords.length}`);
// // //     console.log(`===================================`);
// // //
// // // } catch (err) {
// // //     console.error("Ошибка при генерации:", err);
// // // }