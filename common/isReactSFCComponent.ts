import * as ts from 'typescript';

export function isReactSFCComponent(typeChecker: ts.TypeChecker, signature: ts.Signature) {
    const returnType = typeChecker.getReturnTypeOfSignature(signature);
    return isReactElementType(returnType);
}

function isReactElementType(type: ts.Type) {
    // TODO: more possibilities should be checked
    const symbol = type.getSymbol();
    const typeName = getFullyQualifiedName(symbol);
    if (typeName === 'JSX.Element') {
        return true;
    }
    return false;
}

function getFullyQualifiedName(symbol: ts.Symbol | undefined) {
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
    return (symbol as any)['parent'] as ts.Symbol | undefined;
}