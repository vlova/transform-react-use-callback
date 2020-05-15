import ts from "typescript";

export type ReactComponentNode
    = ts.ArrowFunction
    | ts.FunctionExpression
    | ts.FunctionDeclaration;

export type ReactCallbackNode
    = ts.ArrowFunction
    | ts.FunctionExpression
    | ts.FunctionDeclaration;