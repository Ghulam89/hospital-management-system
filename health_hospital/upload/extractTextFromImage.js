const { createWorker } = require('tesseract.js');


async function extractTextFromImage(imagePath) {
    const worker = createWorker();
    // await (await worker).load();
    // await worker.loadLanguage('eng+urd');
    await (await worker).reinitialize('eng+urd');

    // Read text from the image
    const data = await (await worker).recognize(imagePath);

    console.log(data.data.text);

    await (await worker).terminate();

    return data.data.text;
}

module.exports = extractTextFromImage;

