import * as ts from 'typescript';
import { findAndUpdateReactSFCComponents } from './findAndUpdateReactSFCComponents';

export function useCallbackTranformer(program: ts.Program) {
    return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
        return (file: ts.SourceFile) => {
            if (!file.fileName.endsWith('.tsx')) {
                return file;
            }

            return findAndUpdateReactSFCComponents(file, ctx, program);
        }
    }
}