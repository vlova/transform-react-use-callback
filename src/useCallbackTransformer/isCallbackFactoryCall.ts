import ts from "typescript";

/**
 * Checks if return type of a call is a function, i.e. if `makeSmth()` returns `() => Type`
**/
export function isCallbackFactoryCall(call: ts.CallExpression, typeChecker: ts.TypeChecker) {
    const signature = typeChecker.getResolvedSignature(call);
    if (signature == null) {
        return false;
    }

    const returnType = typeChecker.getReturnTypeOfSignature(signature);
    return isCallable(returnType);
}

function isCallable(type: ts.Type) {
    return type.getCallSignatures().length > 0;
}
