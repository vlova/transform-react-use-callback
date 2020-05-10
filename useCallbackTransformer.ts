import * as ts from 'typescript';
import { assert } from 'ts-essentials';
import { isNodeContainedIn, isReactSFCComponent } from './common';

// TODO: support normal functions (not arrow only)
// TODO: We should also reject cases like `class MyComponent { render = () => <></> }` - i.e. when function is located inside of class

type CallbackDependencies = ts.Expression[];

enum DependencyType {
    InsideCallback = 'InsideCallback',
    InsideComponent = 'InsideComponent',
    OutsideOfComponent = 'OutsideOfComponent',
    Constant = 'Constant',
    NotRef = 'NotRef'
}

function gatherCallbackDependencies(
    typeChecker: ts.TypeChecker,
    functionNode: ts.ArrowFunction,
    componentNode: ts.ArrowFunction
): CallbackDependencies {
    const dependencies: CallbackDependencies = [];

    function getDependencyType(node: ts.Node): DependencyType {
        switch (node.kind) {
            case ts.SyntaxKind.Identifier: {
                assert(ts.isIdentifier(node));

                const declaration = typeChecker.getSymbolAtLocation(node)?.valueDeclaration!;

                if (isNodeContainedIn(declaration, functionNode)) {
                    return DependencyType.InsideCallback;
                } else if (isNodeContainedIn(declaration, componentNode)) {
                    return DependencyType.InsideComponent;
                } else {
                    return DependencyType.OutsideOfComponent;
                }
            }

            // This is required for supporting cases like (a.b).c - i.e. when you have parens inside of simple expression
            case ts.SyntaxKind.ParenthesizedExpression: {
                assert(ts.isParenthesizedExpression(node));
                return getDependencyType(node.expression);
            }

            // This is required for supporting a.b - i.e. property access
            case ts.SyntaxKind.PropertyAccessExpression: {
                assert(ts.isPropertyAccessExpression(node));
                return getDependencyType(node.expression);
            }

            // This is required for supporting (a as any).b - i.e. cast
            case ts.SyntaxKind.AsExpression: {
                assert(ts.isAsExpression(node));
                return getDependencyType(node.expression);
            }

            // This is required for supporting a!.b - i.e. non-null assertion
            case ts.SyntaxKind.NonNullExpression: {
                assert(ts.isNonNullExpression(node));
                return getDependencyType(node.expression);
            }

            // This is required for supporting numbers like 1 and strings like '1' or "1"
            case ts.SyntaxKind.NumericLiteral:
            case ts.SyntaxKind.StringLiteral: {
                return DependencyType.Constant;
            }

            // This is required for supporting template strings like `key`
            case ts.SyntaxKind.NoSubstitutionTemplateLiteral: {
                assert(ts.isNoSubstitutionTemplateLiteral(node));
                return DependencyType.Constant;
            }

            // This is required for supporting template strings like `key${var}`
            case ts.SyntaxKind.TemplateExpression: {
                assert(ts.isTemplateExpression(node));
                return [node.head, ...node.templateSpans]
                    .map(getDependencyType)
                    .reduce(combineDependencyTypes);
            }

            // This is required for supporting template strings like `key${var}`
            case ts.SyntaxKind.TemplateHead:
            case ts.SyntaxKind.TemplateMiddle:
            case ts.SyntaxKind.TemplateTail: {
                return DependencyType.Constant;
            }

            // This is required for supporting template strings like `key${var}`
            case ts.SyntaxKind.TemplateExpression: {
                assert(ts.isTemplateExpression(node));
                return node.templateSpans
                    .map(getDependencyType)
                    .reduce(combineDependencyTypes);
            }

            // This is required for supporting template strings like `key${var}`
            case ts.SyntaxKind.TemplateSpan: {
                assert(ts.isTemplateSpan(node));
                return getDependencyType(node.expression);
            }

            // This is required for supporting a[0] or a['key'] - i.e. array/dictionary access
            case ts.SyntaxKind.ElementAccessExpression: {
                assert(ts.isElementAccessExpression(node));
                const mainExpressionType = getDependencyType(node.expression);
                const argumentExpressionType = getDependencyType(node.argumentExpression);
                return combineDependencyTypes(mainExpressionType, argumentExpressionType);
            }

            // TODO: check if there are more suitable cases
            // TODO: what about map.get()? is there a way to optimize it?

            default: {
                return DependencyType.NotRef;
            }
        }
    }

    function combineDependencyTypes(leftRefType: DependencyType, rightRefType: DependencyType): DependencyType {
        const refPriority = [
            DependencyType.Constant,
            DependencyType.OutsideOfComponent,
            DependencyType.InsideComponent,
            DependencyType.InsideCallback,
            DependencyType.NotRef
        ]

        const leftIndex = refPriority.findIndex(r => r === leftRefType);
        const rightIndex = refPriority.findIndex(r => r === rightRefType);

        assert(leftIndex !== -1);
        assert(rightIndex !== -1);

        return (leftIndex > rightIndex)
            ? leftRefType
            : rightRefType;
    }

    function visitor(node: ts.Node): void {
        const refType = getDependencyType(node);
        if (refType === DependencyType.InsideComponent) {
            dependencies.push(node as ts.Expression);
        } else if (refType === DependencyType.NotRef) {
            ts.forEachChild(node, visitor);
        }
    }

    ts.forEachChild(functionNode, visitor);

    return dependencies;
}

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
