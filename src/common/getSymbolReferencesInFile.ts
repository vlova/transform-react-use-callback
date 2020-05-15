import * as ts from 'typescript';
import { assert } from 'ts-essentials';

// TODO(perf): Consider in future to have Map<DeclarationIdentifier, ReferenceIdentifier[]>

/**
 * Accepts identifier on declaration node & returns all references inside of container
**/
export function getSymbolReferencesInFile(p: {
    identifierToFind: ts.Identifier,
    typeChecker: ts.TypeChecker,
    container: ts.Node
}) {
    assert(
        typeof ((ts as any)['FindAllReferences']?.Core?.eachSymbolReferenceInFile)
        === 'function'
    );

    const refs: ts.Identifier[] = [];

    // Please, note, this is dangerous trick. You can punch me, if that will go into npm.
    (ts as any)['FindAllReferences'].Core.eachSymbolReferenceInFile(
        p.identifierToFind,
        p.typeChecker,
        p.identifierToFind.getSourceFile(),
        (ref: any) => refs.push(ref),
        p.container
    );

    return refs;
}