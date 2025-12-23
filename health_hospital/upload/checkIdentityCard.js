function checkIdentityCard(text) {
    const requiredWords = [
        "PAKISTAN",
        "National Identity Card",
        "Gender",
        "Country of Stay",
        "identity Number",
        "Date of Birth",
    ];

    const missingWords = [];

    for (const word of requiredWords) {
        const regex = new RegExp(word, "i"); // Case-insensitive search
        if (!regex.test(text)) {
            missingWords.push(word);
        }
    }

    if (missingWords.length > 2) {
        return "Not found: " + missingWords.join(", ");
    } else {
        return true;
    }
}



module.exports=checkIdentityCard