import ts from "typescript";
import { assert } from "ts-essentials";

export function hasShortReturn(statement: ts.Statement) {
    let conditionalNodeCounter = 0;
    let innerFunctionCounter = 0;
    let hadShortReturn = false;

    const visit = (node: ts.Node) => {
        switch (node.kind) {
            case ts.SyntaxKind.ReturnStatement: {
                if (innerFunctionCounter === 0 && conditionalNodeCounter > 0) {
                    hadShortReturn = true;
                }

                return;
            }

            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.FunctionExpression:
            case ts.SyntaxKind.ArrowFunction: {
                innerFunctionCounter++;
                try {
                    ts.forEachChild(node, visit);
                } finally {
                    innerFunctionCounter--;
                }

                return;
            }

            case ts.SyntaxKind.IfStatement: {
                assert(ts.isIfStatement(node));
                conditionalNodeCounter++;
                try {
                    visit(node.thenStatement);
                    if (node.elseStatement) {
                        visit(node.elseStatement);
                    }
                } finally {
                    conditionalNodeCounter--;
                }

                return;
            }

            default: {
                ts.forEachChild(node, visit);
            }
        }
    }

    visit(statement);

    return hadShortReturn;
}