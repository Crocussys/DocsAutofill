async function getDataFromClipboard(parser) {
    try {
        const text = await navigator.clipboard.readText();
        if (!text) {
            return {};
        }
        if (typeof parser === 'function') {
            return parser(text);
        }
        return text;
    } catch (error) {
        return {};
    }
}
