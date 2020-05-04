import * as ts from 'typescript';
import { assert } from 'ts-essentials';
import { isReactSFCComponent } from './common';
import { isNodeContainedIn } from './common/isNodeContainedIn';

// TODO: support normal functions (not arrow only)
// TODO: We should also reject cases like `class MyComponent { render = () => <></> }` - i.e. when function is located inside of class

interface CallbackRefs {
    insideCallbackRefs: ts.Expression[];
    insideComponentRefs: ts.Expression[];
    outsideRefs: ts.Expression[];
}

// TODO: should be a flags enum
enum RefType {
    InsideCallback,
    InsideComponent,
    OutsideRef,
    NotARef
}

function gatherCallbackRefs(typeChecker: ts.TypeChecker, functionNode: ts.ArrowFunction, componentNode: ts.ArrowFunction): CallbackRefs {
    const context: CallbackRefs = {
        insideComponentRefs: [],
        insideCallbackRefs: [],
        outsideRefs: []
    };

    function getRefTypeOfExpression(node: ts.Node): RefType {
        switch (node.kind) {
            case ts.SyntaxKind.Identifier: {
                assert(ts.isIdentifier(node));

                const declaration = typeChecker.getSymbolAtLocation(node)?.valueDeclaration!;

                if (isNodeContainedIn(declaration, functionNode)) {
                    return RefType.InsideCallback;
                } else if (isNodeContainedIn(declaration, componentNode)) {
                    return RefType.InsideComponent;
                } else {
                    return RefType.OutsideRef;
                }
            }

            // This is required for supporting cases like (a.b).c - i.e. when you have parens inside of simple expression
            case ts.SyntaxKind.ParenthesizedExpression: {
                assert(ts.isParenthesizedExpression(node));
                return getRefTypeOfExpression(node.expression);
            }

            // This is required for supporting a.b - i.e. property access
            case ts.SyntaxKind.PropertyAccessExpression: {
                assert(ts.isPropertyAccessExpression(node));
                return getRefTypeOfExpression(node.expression);
            }

            // This is required for supporting (a as any).b - i.e. cast
            case ts.SyntaxKind.AsExpression:
            // This is required for supporting a[0] or a['key'] - i.e. array/dictionary access
            case ts.SyntaxKind.ElementAccessExpression:
            // This is required for supporting a!.b - i.e. non-null assertion
            case ts.SyntaxKind.NonNullExpression:
                {
                    throw new Error('not implemented exception');
                }

            // TODO: check if there are more suitable cases
            // TODO: what about map.get()? is there a way to optimize it?

            default: {
                return RefType.NotARef;
            }
        }
    }

    function visitor(node: ts.Node): void {
        switch (node.kind) {
            // TODO: it's possible that all of this logic can be collapsed without conditions
            case ts.SyntaxKind.ElementAccessExpression:
            case ts.SyntaxKind.ParenthesizedExpression:
            case ts.SyntaxKind.PropertyAccessExpression: {
                const refType = getRefTypeOfExpression(node);
                if (refType !== RefType.NotARef) {
                    addRef({ refType, node: node as ts.Expression });
                } else {
                    ts.forEachChild(node, visitor);
                }

                break;
            }

            case ts.SyntaxKind.Identifier: {
                assert(ts.isIdentifier(node));
                const refType = getRefTypeOfExpression(node);
                addRef({ refType, node });

                break;
            }

            default:
                ts.forEachChild(node, visitor);
                break;
        }
    }

    ts.forEachChild(functionNode, visitor);

    return context;

    function addRef({ refType, node }: { refType: RefType; node: ts.Expression; }) {
        // TODO: did me hear about switch?
        if (refType == RefType.InsideCallback) {
            context.insideCallbackRefs.push(node);
        }
        else if (refType == RefType.InsideComponent) {
            context.insideComponentRefs.push(node);
        }
        else if (refType === RefType.OutsideRef) {
            context.outsideRefs.push(node);
        } else if (refType === RefType.NotARef) {
            // nothing
        }
    }
}

type CallbackDescription = {
    function: ts.ArrowFunction,
    replacement: ts.Node,
    refs: CallbackRefs
}

// TODO: it should ensure that React is imported
// TODO: it should put React.useCallback out of rendering
// TODO: it shouldn't rewrite to useCallback when callback depends on variable defined in if/for/map
// TODO: it should correctly rewrite useCallback when it's defined in if/for (i.e. should hoist)
// TODO: should order refs in alpha order for tests
function visitReactSFCComponent(componentNode: ts.ArrowFunction, typeChecker: ts.TypeChecker, ctx: ts.TransformationContext): ts.Node {
    function generateUseCallback(functionNode: ts.ArrowFunction, refs: CallbackRefs): ts.Node {
        const body = functionNode;
        const identifiers = refs.insideComponentRefs;

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
                    const refs = gatherCallbackRefs(typeChecker, node, componentNode);
                    callbacks.push({
                        function: node,
                        replacement: generateUseCallback(node, refs),
                        refs
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
                    const refs = gatherCallbackRefs(typeChecker, node, componentNode);
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
