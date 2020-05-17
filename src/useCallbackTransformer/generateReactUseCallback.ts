import ts from "typescript";
import { ReactCallbackNode } from "./types";
import { ReactCallbackDependencies } from "./gatherCallbackDependencies";
import { assert } from "ts-essentials";
import { callbackToExpression } from "./callbackToExpression";

export function generateReactUseCallback(
    functionNode: ReactCallbackNode,
    deps: ReactCallbackDependencies
): ts.Node {
    const callbackWithUseCallback = ts.createCall(
        ts.createPropertyAccess(
            ts.createIdentifier("React"),
            ts.createIdentifier("useCallback")
        ),
        undefined,
        [
            callbackToExpression(functionNode),
            ts.createArrayLiteral(
                deps,
                false
            )
        ]
    );

    if (ts.isFunctionDeclaration(functionNode)) {
        assert(functionNode.name != null);

        return ts.createVariableStatement(
            undefined,
            ts.createVariableDeclarationList(
                [ts.createVariableDeclaration(
                    functionNode.name!,
                    undefined,
                    callbackWithUseCallback
                )],
                ts.NodeFlags.Const
            )
        );
    }

    return callbackWithUseCallback;

}