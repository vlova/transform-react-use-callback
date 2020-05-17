import { ReactCallbackNode } from "./types";
import ts from "typescript";
import { assert } from "ts-essentials";

export function callbackToExpression(functionNode: ReactCallbackNode): ts.Expression {
    if (ts.isFunctionDeclaration(functionNode)) {
        assert(functionNode.body != null);

        return ts.createFunctionExpression(
            functionNode.modifiers,
            functionNode.asteriskToken,
            functionNode.name,
            functionNode.typeParameters,
            functionNode.parameters,
            functionNode.type,
            functionNode.body
        );
    }

    return functionNode;
}