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

type ComponentTransformationResult = {
    componentNode: ReactComponentNode,
    variablesToHoistOutOfComponent: ts.VariableStatement[]
}

// TODO: it should ensure that React is imported
// TODO: it should put React.useCallback out of rendering
// TODO: it shouldn't rewrite to useCallback when callback depends on variable defined in if/for/map
// TODO: it should correctly rewrite useCallback when it's defined in if/for (i.e. should hoist)
// TODO: should order refs in alpha order for tests
export function visitReactSFCComponent(
    componentNode: ReactComponentNode,
    typeChecker: ts.TypeChecker,
    ctx: ts.TransformationContext
): ComponentTransformationResult {
    function gatherCallbacks(componentNode: ReactComponentNode): CallbackDescription[] {
        const callbacks: CallbackDescription[] = [];

        // TODO(perf): prevent digging into nodes that can't contain callback
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

    function replaceCallbacks(componentNode: ReactComponentNode): ComponentTransformationResult {
        const callbacks = gatherCallbacks(componentNode);
        if (callbacks.length === 0) {
            return {
                componentNode,
                variablesToHoistOutOfComponent: []
            }
        }

        const inlineReplacementMap = new Map(
            callbacks
                .filter(c => c.dependencies.length > 0)
                .map(c => [c.function as any, c.replacement]));

        const hoistOutOfComponentLevel = getVariablesToHoistOutOfComponentLevel(callbacks);

        for (const toHoist of hoistOutOfComponentLevel) {
            // TODO: consider using ctx.hoistVariableDeclaration + ctx.addInitializationStatement
            // when ctx.addInitializationStatement will be available for using
            inlineReplacementMap.set(toHoist.functionNode, toHoist.variableIdentifier);
        }

        // TODO(perf): consider visiting on such parts of tree that contains replacement nodes
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
            if (inlineReplacementMap.has(node)) {
                return inlineReplacementMap.get(node);
            }

            return ts.visitEachChild(node, visitor, ctx);
        }

        const newComponentNode = ts.visitEachChild(componentNode, visitor, ctx);
        return {
            componentNode: newComponentNode,
            variablesToHoistOutOfComponent: hoistOutOfComponentLevel.map(h => h.variableStatement)
        };
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

function getVariablesToHoistOutOfComponentLevel(callbacks: CallbackDescription[]) {
    return callbacks
        .filter(c => c.dependencies.length === 0)
        .map(s => {
            const variableIdentifier = ts.createUniqueName("$myHoistedCallback");
            return {
                functionNode: s.function as ts.Node,
                variableIdentifier,
                variableStatement: ts.createVariableStatement(undefined, ts.createVariableDeclarationList([
                    ts.createVariableDeclaration(variableIdentifier, undefined, s.function)
                ], ts.NodeFlags.Const))
            };
        });
}