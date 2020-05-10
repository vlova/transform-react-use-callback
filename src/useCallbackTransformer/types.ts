import ts from "typescript";

export type ReactComponentNode
    = ts.ArrowFunction
    | ts.FunctionExpression
    | ts.FunctionDeclaration;