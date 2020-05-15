import * as ts from 'typescript';
import { assert } from 'ts-essentials';
import { ReactCallbackDependencies, gatherCallbackDependencies } from './gatherCallbackDependencies';
import { getFullyQualifiedName } from '../common/getFullyQualifiedName';
import { ReactComponentNode, ReactCallbackNode } from './types';
import { getSymbolReferencesInFile } from '../common';

type ReactCallbackDescription = {
    callback: ReactCallbackNode,
    replacement: ts.Node,
    dependencies: ReactCallbackDependencies
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
    function gatherCallbacks(componentNode: ReactComponentNode): ReactCallbackDescription[] {
        const callbacks: ReactCallbackDescription[] = [];

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

                case ts.SyntaxKind.FunctionDeclaration:
                case ts.SyntaxKind.FunctionExpression:
                case ts.SyntaxKind.ArrowFunction: {
                    assert(
                        ts.isArrowFunction(node) ||
                        ts.isFunctionExpression(node) ||
                        ts.isFunctionDeclaration(node)
                    );
                    const dependencies = gatherCallbackDependencies(typeChecker, node, componentNode);
                    callbacks.push({
                        callback: node,
                        replacement: generateReactUseCallback(node, dependencies),
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

        const inlineReplacementMap = new Map<ts.Node, ts.Node | undefined>(
            callbacks
                .filter(c => c.dependencies.length > 0)
                .map(c => [c.callback, c.replacement]));

        const hoistOutOfComponentLevel = getCallbacksToHoistOutOfComponent(callbacks, typeChecker, componentNode);

        for (const toHoist of hoistOutOfComponentLevel) {
            // TODO: consider using ctx.hoistVariableDeclaration + ctx.addInitializationStatement
            // when ctx.addInitializationStatement will be available for using

            if (toHoist.type === 'hoistFunctionDeclaration') {
                inlineReplacementMap.set(toHoist.callbackNode, undefined);

                for (const reference of toHoist.references) {
                    inlineReplacementMap.set(reference, toHoist.newVariableIdentifier);
                }
            } else {
                inlineReplacementMap.set(toHoist.callbackNode, toHoist.newVariableIdentifier);
            }
        }

        // TODO(perf): consider visiting only such parts of tree that contains replacement nodes
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

function generateReactUseCallback(
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

function callbackToExpression(functionNode: ReactCallbackNode): ts.Expression {
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

type ReactCallbackHoistDirective
    = {
        type: 'hoistFunctionExpression',
        callbackNode: ReactCallbackNode,
        newVariableIdentifier: ts.Identifier,
        variableStatement: ts.VariableStatement
    } | {
        type: 'hoistFunctionDeclaration',
        callbackNode: ts.FunctionDeclaration,
        newVariableIdentifier: ts.Identifier,
        references: ts.Identifier[],
        variableStatement: ts.VariableStatement
    };

function getCallbacksToHoistOutOfComponent(
    callbacks: ReactCallbackDescription[],
    typeChecker: ts.TypeChecker,
    componentNode: ReactComponentNode
): ReactCallbackHoistDirective[] {
    return callbacks
        .filter(c => c.dependencies.length === 0)
        .map(callback => convertCallbackToHoistDirective(callback, typeChecker, componentNode));
}

function convertCallbackToHoistDirective(
    callback: ReactCallbackDescription,
    typeChecker: ts.TypeChecker,
    componentNode: ReactComponentNode
): ReactCallbackHoistDirective {
    const newVariableIdentifier = ts.createUniqueName("$myHoistedCallback");
    const variableStatement = ts.createVariableStatement(undefined,
        ts.createVariableDeclarationList([
            ts.createVariableDeclaration(newVariableIdentifier, undefined,
                callbackToExpression(callback.callback))
        ], ts.NodeFlags.Const));

    if (ts.isFunctionDeclaration(callback.callback)) {
        // Well, I suppose that it's impossible to have function declaration (not function expression) without name
        assert(callback.callback.name != null);

        const references = getSymbolReferencesInFile({
            identifierToFind: callback.callback.name,
            container: componentNode,
            typeChecker: typeChecker
        });

        return {
            type: 'hoistFunctionDeclaration',
            callbackNode: callback.callback,
            newVariableIdentifier,
            variableStatement: variableStatement,
            references
        }
    } else {
        return {
            type: 'hoistFunctionExpression',
            callbackNode: callback.callback,
            newVariableIdentifier,
            variableStatement: variableStatement
        };
    }
}