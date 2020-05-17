import ts from "typescript";
import { ReactComponentNode, ReactCallbackDescription, ReactCallbackNode } from "./types";
import { gatherCallbackDependencies } from "./gatherCallbackDependencies";
import { getFullyQualifiedName } from "../common/getFullyQualifiedName";
import { isCallbackFactoryCall } from "./isCallbackFactoryCall";
import { hasShortReturn } from "./hasShortReturn";
import { assert } from "ts-essentials";
import { generateReactUseCallback } from "./generateReactUseCallback";


const denyWrappingIfDefinedIn = new Set([
    "React.useCallback",
    "React.useMemo",
]);

const conditionalTokens = new Set([
    ts.SyntaxKind.AmpersandAmpersandToken, // &&
    ts.SyntaxKind.QuestionQuestionToken, // ??
    ts.SyntaxKind.BarBarToken // ||
]);

export function gatherCallbacks(componentNode: ReactComponentNode, typeChecker: ts.TypeChecker): ReactCallbackDescription[] {
    let isInConditionalContextCounter = 0;
    const callbacks: ReactCallbackDescription[] = [];

    function withConditionalContext(fn: () => void) {
        isInConditionalContextCounter++;
        try {
            fn();
        } finally {
            isInConditionalContextCounter--;
        }
    }

    function pushCallback(node: ReactCallbackNode) {
        const dependencies = gatherCallbackDependencies(typeChecker, node, componentNode);
        callbacks.push({
            callback: node,
            replacement: generateReactUseCallback(node, dependencies),
            dependencies,
            isInConditionalContext: isInConditionalContextCounter > 0
        });
    }

    // TODO(perf): prevent digging into nodes that can't contain callback
    function visit(node: ts.Node) {
        switch (node.kind) {
            // TODO: okay, but what if callback it's defined in variable & then used inside of React.useCallback?
            // This is hard question especially because variable can be used twicely: one time without useCallback, second time with
            case ts.SyntaxKind.CallExpression: {
                assert(ts.isCallExpression(node));
                const symbol = typeChecker.getSymbolAtLocation(node.expression);
                const symbolName = getFullyQualifiedName(symbol);
                if (symbolName != null && denyWrappingIfDefinedIn.has(symbolName)) {
                    break;
                }

                if (isCallbackFactoryCall(node, typeChecker)) {
                    pushCallback(node);
                }

                ts.forEachChild(node, visit);

                break;
            }

            case ts.SyntaxKind.IfStatement: {
                assert(ts.isIfStatement(node));
                visit(node.expression);

                withConditionalContext(() => {
                    visit(node.thenStatement);
                    if (node.elseStatement) {
                        visit(node.elseStatement);
                    }
                });

                break;
            }

            case ts.SyntaxKind.BinaryExpression: {
                assert(ts.isBinaryExpression(node));

                if (conditionalTokens.has(node.operatorToken.kind)) {
                    visit(node.left);
                    withConditionalContext(() => visit(node.right));
                }

                break;
            }

            // Ternary operator condition ? true : false
            case ts.SyntaxKind.ConditionalExpression: {
                assert(ts.isConditionalExpression(node));

                visit(node.condition);
                withConditionalContext(() => {
                    visit(node.whenTrue);
                    visit(node.whenFalse);
                });

                break;
            }

            case ts.SyntaxKind.ForStatement:
            case ts.SyntaxKind.ForInStatement:
            case ts.SyntaxKind.ForOfStatement:
            case ts.SyntaxKind.WhileStatement:
            case ts.SyntaxKind.DoStatement:
            case ts.SyntaxKind.TryStatement:
            case ts.SyntaxKind.LabeledStatement:
            case ts.SyntaxKind.ContinueStatement:
            case ts.SyntaxKind.BreakStatement:
            case ts.SyntaxKind.ThrowStatement:
            case ts.SyntaxKind.SwitchStatement: {
                throw new Error('not implemented');
            }

            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.FunctionExpression:
            case ts.SyntaxKind.ArrowFunction: {
                assert(
                    ts.isArrowFunction(node) ||
                    ts.isFunctionExpression(node) ||
                    ts.isFunctionDeclaration(node)
                );

                pushCallback(node);

                // It shouldn't dig into childs, because that can broke Block statement processing

                break;
            }

            case ts.SyntaxKind.Block: {
                assert(ts.isBlock(node));
                let hasMeetShortReturn = false;
                for (let statement of node.statements) {
                    // Note that we are sure that it's short return of component level,
                    //   because corresponding case for functions doesn't deeps into blocks
                    hasMeetShortReturn = hasMeetShortReturn || hasShortReturn(statement);

                    if (hasMeetShortReturn) {
                        withConditionalContext(() => visit(statement));
                    } else {
                        visit(statement);
                    }
                }

                break;
            }

            default: {
                ts.forEachChild(node, visit);
                break;
            }
        };

    }

    ts.forEachChild(componentNode, visit);
    return callbacks;
}
