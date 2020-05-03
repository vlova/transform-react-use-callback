export const inlineFile = (strings: TemplateStringsArray) => {
    let string = strings[0];
    string = removeWrongWhitespace(string);
    string = string.replace(/^[\r\n]+/m, '');
    return string;

    function removeWrongWhitespace(string: string) {
        const match = string.match(/^[\r\n]*(\s+)/);
        if (match == undefined || match.length < 1) {
            return string;
        }
        const whitespace = match[1];
        const whitespaceString = new RegExp('^' + whitespace, 'gm');
        string = string.replace(whitespaceString, '');
        return string;
    }
}