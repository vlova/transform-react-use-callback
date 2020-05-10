import * as ts from 'typescript';
import { getFullyQualifiedName } from './getFullyQualifiedName';

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