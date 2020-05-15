import * as ts from 'typescript';

export function getFullyQualifiedName(symbol: ts.Symbol | undefined) {
    if (symbol == undefined) {
        return undefined;
    }

    let name = symbol.name;
    while (true) {
        symbol = getParentSymbol(symbol);
        if (symbol == undefined) {
            break;
        }

        if (symbol?.name === '__global') {
            break;
        }

        name = `${symbol.name}.${name}`;
    }

    return name;
}

function getParentSymbol(symbol: ts.Symbol) {
    // Please, note, this is dangerous trick. You can punch me, if that will go into npm.
    return (symbol as any)['parent'] as ts.Symbol | undefined;
}