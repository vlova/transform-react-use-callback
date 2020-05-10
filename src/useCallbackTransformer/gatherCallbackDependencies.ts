import * as ts from 'typescript';
import { assert } from 'ts-essentials';
import { isNodeContainedIn } from '../common';
import { ReactComponentNode } from './types';


export type CallbackDependencies = ts.Expression[];

export enum DependencyType {
    InsideCallback = 'InsideCallback',
    InsideComponent = 'InsideComponent',
    OutsideOfComponent = 'OutsideOfComponent',
    Constant = 'Constant',
    NotRef = 'NotRef'
}

export function gatherCallbackDependencies(
    typeChecker: ts.TypeChecker,
    functionNode: ts.ArrowFunction | ts.FunctionExpression,
    componentNode: ReactComponentNode
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

            case ts.SyntaxKind.ComputedPropertyName: {
                throw new Error('Unsupported');
            }

            // TODO: check if there are more suitable cases
            // TODO: what about map.get()? is there a way to optimize it?

            default: {
                return DependencyType.NotRef;
            }
        }
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


const refPriority = [
    DependencyType.Constant,
    DependencyType.OutsideOfComponent,
    DependencyType.InsideComponent,
    DependencyType.InsideCallback,
    DependencyType.NotRef
]

function combineDependencyTypes(leftRefType: DependencyType, rightRefType: DependencyType): DependencyType {
    const leftIndex = refPriority.findIndex(r => r === leftRefType);
    const rightIndex = refPriority.findIndex(r => r === rightRefType);

    assert(leftIndex !== -1);
    assert(rightIndex !== -1);

    return (leftIndex > rightIndex)
        ? leftRefType
        : rightRefType;
}