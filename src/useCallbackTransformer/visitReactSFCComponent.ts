import * as ts from 'typescript';
import { assert } from 'ts-essentials';
import { CallbackDependencies, gatherCallbackDependencies } from './gatherCallbackDependencies';

// TODO: support normal functions (not arrow only)
type CallbackDescription = {
    function: ts.ArrowFunction,
    replacement: ts.Node,
    dependencies: CallbackDependencies
}

// TODO: it should ensure that React is imported
// TODO: it should put React.useCallback out of rendering
// TODO: it shouldn't rewrite to useCallback when callback depends on variable defined in if/for/map
// TODO: it should correctly rewrite useCallback when it's defined in if/for (i.e. should hoist)
// TODO: should order refs in alpha order for tests
export function visitReactSFCComponent(
    componentNode: ts.ArrowFunction,
    typeChecker: ts.TypeChecker,
    ctx: ts.TransformationContext
): ts.Node {

    function gatherCallbacks(componentNode: ts.ArrowFunction): CallbackDescription[] {
        const callbacks: CallbackDescription[] = [];

        function visitor(node: ts.Node) {
            switch (node.kind) {
                case ts.SyntaxKind.ArrowFunction: {
                    assert(ts.isArrowFunction(node));
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

    function replaceCallbacks(componentNode: ts.ArrowFunction): ts.Node {
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

function generateUseCallback(functionNode: ts.ArrowFunction, refs: CallbackDependencies): ts.Node {
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