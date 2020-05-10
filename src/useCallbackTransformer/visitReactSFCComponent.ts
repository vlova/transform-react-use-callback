import * as ts from 'typescript';
import { assert } from 'ts-essentials';
import { CallbackDependencies, gatherCallbackDependencies } from './gatherCallbackDependencies';
import { getFullyQualifiedName } from '../common/getFullyQualifiedName';
import { ReactComponentNode } from './types';

// TODO: support normal functions (not arrow only)
type CallbackDescription = {
    function: ts.ArrowFunction | ts.FunctionExpression,
    replacement: ts.Node,
    dependencies: CallbackDependencies
}

const denyWrappingIfDefinedIn = new Set([
    "React.useCallback",
    "React.useMemo",
]);

// TODO: it should ensure that React is imported
// TODO: it should put React.useCallback out of rendering
// TODO: it shouldn't rewrite to useCallback when callback depends on variable defined in if/for/map
// TODO: it should correctly rewrite useCallback when it's defined in if/for (i.e. should hoist)
// TODO: should order refs in alpha order for tests
export function visitReactSFCComponent(
    componentNode: ReactComponentNode,
    typeChecker: ts.TypeChecker,
    ctx: ts.TransformationContext
): ts.Node {
    function gatherCallbacks(componentNode: ReactComponentNode): CallbackDescription[] {
        const callbacks: CallbackDescription[] = [];

        function visitor(node: ts.Node) {
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

                    ts.forEachChild(node, visitor);
                    break;
                }

                case ts.SyntaxKind.FunctionExpression:
                case ts.SyntaxKind.ArrowFunction: {
                    assert(ts.isArrowFunction(node) || ts.isFunctionExpression(node));
                    const dependencies = gatherCallbackDependencies(typeChecker, node, componentNode);
                    callbacks.push({
                        function: node,
                        replacement: generateUseCallback(node, dependencies),
                        dependencies
                    });
                    break;
                }

                default: {
                    ts.forEachChild(node, visitor);
                    break;
                }
            };

        }

        ts.forEachChild(componentNode, visitor);
        return callbacks;
    }

    function replaceCallbacks(componentNode: ReactComponentNode): ts.Node {
        const callbacks = gatherCallbacks(componentNode);
        if (callbacks.length === 0) {
            return componentNode;
        }

        const inlineReplacementMap = new Map(callbacks.map(c => [c.function as any, c.replacement]));
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
            if (inlineReplacementMap.has(node)) {
                return inlineReplacementMap.get(node);
            }

            return ts.visitEachChild(node, visitor, ctx);
        }

        return ts.visitEachChild(componentNode, visitor, ctx);
    }

    return replaceCallbacks(componentNode);
}

function generateUseCallback(functionNode: ts.ArrowFunction | ts.FunctionExpression, refs: CallbackDependencies): ts.Node {
    const body = functionNode;
    const identifiers = refs;

    return ts.createCall(
        ts.createPropertyAccess(
            ts.createIdentifier("React"),
            ts.createIdentifier("useCallback")
        ),
        undefined,
        [
            body,
            ts.createArrayLiteral(
                identifiers,
                false
            )
        ]
    );
}