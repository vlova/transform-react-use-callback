import * as ts from 'typescript';
import { assert } from 'ts-essentials';
import { isReactSFCComponent } from '../common';
import { visitReactSFCComponent } from './visitReactSFCComponent';

// TODO: support normal functions (not arrow only)
// TODO: We should also reject cases like `class MyComponent { render = () => <></> }` - i.e. when function is located inside of class

export function findAndUpdateReactSFCComponents(file: ts.SourceFile, ctx: ts.TransformationContext, program: ts.Program) {
    const visitor: ts.Visitor = node => {
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

    return ts.visitNode(file, visitor);
}