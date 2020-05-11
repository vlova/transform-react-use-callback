import * as ts from 'typescript';
import { assert } from 'ts-essentials';
import { isReactSFCComponent } from '../common';
import { visitReactSFCComponent } from './visitReactSFCComponent';
import { getFullyQualifiedName } from '../common/getFullyQualifiedName';

// TODO: support normal functions (not arrow only)
// TODO: We should also reject cases like `class MyComponent { render = () => <></> }` - i.e. when function is located inside of class

export function findAndUpdateReactSFCComponents(file: ts.SourceFile, ctx: ts.TransformationContext, program: ts.Program) {
    const visitor: ts.Visitor = node => {
        // TODO(perf): prevent digging into nodes that can't contain React component
        switch (node.kind) {
            case ts.SyntaxKind.ClassDeclaration: {
                // TODO(perf): consider to short return here always as defining component in class is bullshit
                assert(ts.isClassDeclaration(node));
                const typeChecker = program.getTypeChecker();
                const type = typeChecker.getTypeAtLocation(node);
                const isReactComponent = checkIfTypeExtends(type, "React.Component");
                if (isReactComponent) {
                    return node;
                } else {
                    return ts.visitEachChild(node, visitor, ctx);
                }
            }

            case ts.SyntaxKind.FunctionDeclaration:
            case ts.SyntaxKind.FunctionExpression:
            case ts.SyntaxKind.ArrowFunction: {
                assert(
                    ts.isArrowFunction(node) ||
                    ts.isFunctionExpression(node) ||
                    ts.isFunctionDeclaration(node));

                const typeChecker = program.getTypeChecker();
                const signature = typeChecker.getSignatureFromDeclaration(node);
                if (signature != null && isReactSFCComponent(typeChecker, signature)) {
                    node = visitReactSFCComponent(node, typeChecker, ctx);
                    // TODO(perf): consider to short return here, as nested react components are bullshit
                }

                return ts.visitEachChild(node, visitor, ctx);
            }

            default:
                return ts.visitEachChild(node, visitor, ctx);
        }
    }

    return ts.visitNode(file, visitor);
}

function checkIfTypeExtends(type: ts.Type, baseClassName: string) {
    const baseTypes = type.getBaseTypes() || [];
    const qualifiedNames = baseTypes.map(type => getFullyQualifiedName(type.symbol));
    const isReactComponent = qualifiedNames.find(name => name === baseClassName);
    return isReactComponent;
}
