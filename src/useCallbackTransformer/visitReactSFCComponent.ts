import * as ts from 'typescript';
import { assert } from 'ts-essentials';
import { ReactComponentNode, ReactCallbackNode, ReactCallbackDescription } from './types';
import { getSymbolReferencesInFile } from '../common';
import { gatherCallbacks } from './gatherCallbacks';
import { callbackToExpression } from './callbackToExpression';

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
    function replaceCallbacks(componentNode: ReactComponentNode): ComponentTransformationResult {
        const callbacks = gatherCallbacks(componentNode, typeChecker);
        if (callbacks.length === 0) {
            return {
                componentNode,
                variablesToHoistOutOfComponent: []
            }
        }

        const inlineReplacementMap = new Map<ts.Node, ts.Node | undefined>(
            callbacks
                .filter(c => c.dependencies.length > 0 && !c.isInConditionalContext)
                .map(c => [c.callback, c.replacement]));

        const hoistOutOfComponentLevel = getCallbacksToHoistOutOfComponent(callbacks, typeChecker, componentNode);
        const hoistInComponent = getCallbacksToHoistInComponent(callbacks);
        const hoistAll = [...hoistOutOfComponentLevel, ...hoistInComponent];

        for (const hoistDirective of hoistAll) {
            // TODO: consider using ctx.hoistVariableDeclaration + ctx.addInitializationStatement
            // when ctx.addInitializationStatement will be available for using

            if (hoistDirective.type === 'hoistFunctionDeclaration') {
                inlineReplacementMap.set(hoistDirective.callbackNode, undefined);

                for (const reference of hoistDirective.references) {
                    inlineReplacementMap.set(reference, hoistDirective.newVariableIdentifier);
                }
            } else {
                inlineReplacementMap.set(hoistDirective.callbackNode, hoistDirective.newVariableIdentifier);
            }
        }

        // TODO(perf): consider visiting only such parts of tree that contains replacement nodes
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
            if (inlineReplacementMap.has(node)) {
                return inlineReplacementMap.get(node);
            }

            return ts.visitEachChild(node, visitor, ctx);
        }

        const newComponentNode = injectHoistedVariablesIntoComponent(
            ts.visitEachChild(componentNode, visitor, ctx),
            hoistInComponent,
            ctx);

        return {
            componentNode: newComponentNode,
            variablesToHoistOutOfComponent: hoistOutOfComponentLevel.map(h => h.variableStatement)
        };
    }

    return replaceCallbacks(componentNode);
}

function injectHoistedVariablesIntoComponent(
    componentNode: ReactComponentNode,
    hoist: ReactCallbackHoistDirective[],
    ctx: ts.TransformationContext): ReactComponentNode {
    if (hoist.length === 0) {
        return componentNode;
    }

    assert(componentNode.body != null);
    let statements = [...bodyToStatementList(componentNode.body)];
    const insertVariableBeforeKinds = new Set([
        ts.SyntaxKind.IfStatement,
        ts.SyntaxKind.SwitchStatement,
        ts.SyntaxKind.ReturnStatement
    ]);
    const stopIndex = statements.findIndex(s => insertVariableBeforeKinds.has(s.kind));
    const indexToInsert = stopIndex === -1
        ? 0
        : stopIndex;

    statements.splice(indexToInsert, 0, ...hoist.map(p => p.variableStatement as ts.Statement));

    const newBody = ts.isBlock(componentNode.body)
        ? ts.updateBlock(componentNode.body, statements)
        : ts.createBlock(statements, true);

    return ts.visitEachChild(componentNode, node => {
        if (node === componentNode.body) {
            return newBody;
        } else {
            return node;
        }
    }, ctx)
}

function bodyToStatementList(body: ts.ConciseBody) {
    return ts.isBlock(body)
        ? body.statements
        : [ts.createReturn(body)];
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
        .map(callback => convertZeroDepsCallbackToHoistDirective(callback, typeChecker, componentNode));
}

function getCallbacksToHoistInComponent(
    callbacks: ReactCallbackDescription[]
): ReactCallbackHoistDirective[] {
    return callbacks
        .filter(c => c.dependencies.length > 0 && c.isInConditionalContext)
        .map(callback => convertMultiDepsCallbackToHoistDirective(callback));
}

function convertZeroDepsCallbackToHoistDirective(
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

function convertMultiDepsCallbackToHoistDirective(
    callback: ReactCallbackDescription
): ReactCallbackHoistDirective {
    assert(!ts.isFunctionDeclaration(callback.callback)); // TODO; this should be checked, not sure about it

    const newVariableIdentifier = ts.createUniqueName("$myHoistedCallback");
    const variableStatement = ts.createVariableStatement(undefined,
        ts.createVariableDeclarationList([
            ts.createVariableDeclaration(newVariableIdentifier, undefined,
                callback.replacement as ts.Expression)
        ], ts.NodeFlags.Const));

    return {
        type: 'hoistFunctionExpression',
        callbackNode: callback.callback,
        newVariableIdentifier,
        variableStatement: variableStatement
    };
}