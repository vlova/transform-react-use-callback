import { expect } from 'chai';
import { transformFile } from "ts-transformer-testing-library";
import { useCallbackTranformer } from '../useCallbackTransformer';
import * as fs from 'fs';

const reactTypes = fs.readFileSync('node_modules/@types/react/index.d.ts');

describe('useCallback', () => {
    const testCasesBasePath = 'tests/useCallbackTestCases';
    const testCases = fs.readdirSync(testCasesBasePath);
    for (const testCaseName of testCases) {
        const inputTSX = fs.readFileSync(`${testCasesBasePath}/${testCaseName}/input.tsx`).toString();
        const expectedOutputTSX = fs.readFileSync(`${testCasesBasePath}/${testCaseName}/output.tsx`).toString();
        it(testCaseName, () => {
            // TODO: omg, find a way to do that without compilation. It's slow
            const expectedOutputJSX = compileWithoutTranforms(expectedOutputTSX);
            const actualOutputJSX = compileWithUseCallbackTransform(inputTSX);
            expect(actualOutputJSX).equal(expectedOutputJSX);
        });
    }
});

function compileWithoutTranforms(expectedOutputTSX: string) {
    return transformFile({
        path: '/index.tsx',
        contents: expectedOutputTSX
    }, {
        transforms: [],
        mocks: [
            {
                name: 'react',
                content: reactTypes.toString()
            }
        ]
    });
}

function compileWithUseCallbackTransform(inputTSX: string) {
    return transformFile({
        path: '/index.tsx',
        contents: inputTSX
    }, {
        transforms: [useCallbackTranformer],
        mocks: [
            {
                name: 'react',
                content: reactTypes.toString()
            }
        ]
    });
}
