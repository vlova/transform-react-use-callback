import * as ts from 'typescript';

export function isNodeContainedIn(what: ts.Node, where: ts.Node) {
    let node = what;
    while (node != null) {
        if (node.parent === where) {
            return true;
        }

        node = node.parent;
    }

    return false;
}