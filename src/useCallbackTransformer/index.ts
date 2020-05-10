import * as ts from 'typescript';
import { assert } from 'ts-essentials';
import { isReactSFCComponent } from '../common';
import { CallbackDependencies, gatherCallbackDependencies } from './gatherCallbackDependencies';

// TODO: support normal functions (not arrow only)
// TODO: We should also reject cases like `class MyComponent { render = () => <></> }` - i.e. when function is located inside of class

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
function visitReactSFCComponent(componentNode: ts.ArrowFunction, typeChecker: ts.TypeChecker, ctx: ts.TransformationContext): ts.Node {
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

    function gatherCallbacks(componentNode: ts.ArrowFunction): CallbackDescription[] {
        const callbacks: CallbackDescription[] = [];

        function visitor(node: ts.Node) {
            switch (node.kind) {
                case ts.SyntaxKind.ArrowFunction: {
                    assert(ts.isArrowFunction(node));
                    const refs = gatherCallbackDependencies(typeChecker, node, componentNode);
                    callbacks.push({
                        function: node,
                        replacement: generateUseCallback(node, refs),
                        dependencies: refs
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
        function visitor(node: ts.Node): ts.VisitResult<ts.Node> {
            switch (node.kind) {
                case ts.SyntaxKind.ArrowFunction: {
                    assert(ts.isArrowFunction(node));
                    const refs = gatherCallbackDependencies(typeChecker, node, componentNode);
                    const replacement = generateUseCallback(node, refs);
                    return replacement;
                }
                default: {
                    return ts.visitEachChild(node, visitor, ctx);
                }
            };

        }

        return ts.visitEachChild(componentNode, visitor, ctx);
    }

    // const callbacks = gatherCallbacks(componentNode);
    return replaceCallbacks(componentNode);
}

export function useCallbackTranformer(program: ts.Program) {
    function makeFindAndUpdateReactSFCComponents(ctx: ts.TransformationContext, file: ts.SourceFile) {
        const visitor: ts.Visitor = (node: ts.Node): ts.VisitResult<ts.Node> => {
            switch (node.kind) {
                case ts.SyntaxKind.ArrowFunction: {
                    assert(ts.isArrowFunction(node));

                    const typeChecker = program.getTypeChecker();
                    const signature = typeChecker.getSignatureFromDeclaration(node);
                    if (signature != null && isReactSFCComponent(typeChecker, signature)) {
                        node = visitReactSFCComponent(node, typeChecker, ctx);
                    }

                    return ts.visitEachChild(node, visitor, ctx);
                }
                default:
                    return ts.visitEachChild(node, visitor, ctx);
            }
        }

        return visitor;
    }

    return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
        return (file: ts.SourceFile) => {
            if (!file.fileName.endsWith('.tsx')) {
                return file;
            }

            return ts.visitNode(file, makeFindAndUpdateReactSFCComponents(ctx, file));
        }
    }
}
