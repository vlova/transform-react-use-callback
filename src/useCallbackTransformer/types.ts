import ts from "typescript";
import { ReactCallbackDependencies } from "./gatherCallbackDependencies";

export type ReactComponentNode
    = ts.ArrowFunction
    | ts.FunctionExpression
    | ts.FunctionDeclaration;

export type ReactCallbackNode
    = ts.ArrowFunction
    | ts.FunctionExpression
    | ts.FunctionDeclaration
    | ts.CallExpression;

export type ReactCallbackDescription = {
    callback: ReactCallbackNode,
    replacement: ts.Node,
    dependencies: ReactCallbackDependencies,
    isInConditionalContext: boolean
}