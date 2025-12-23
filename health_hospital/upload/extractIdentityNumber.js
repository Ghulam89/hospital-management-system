function extractIdentityNumber(text) {
    const regex = /(\d{5}\s*-\s*\d{7}\s*-\s*\d{1})/; // Regular expression to match the identity number pattern

    const match = text.match(regex);

    if (match && match[1]) {
        return match[1].replace(/\s/g, ''); // Remove spaces
    } else {
        return null; // Return null if no match is found
    }
}



module.exports=extractIdentityNumber