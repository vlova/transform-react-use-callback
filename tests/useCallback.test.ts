import { expect } from 'chai';
import { useCallbackTranformer } from '../useCallbackTransformer';
import * as fs from 'fs';
import { transformAndPrettyPrint } from './common';


describe('useCallback', () => {
    const testCasesBasePath = 'tests/useCallbackTestCases';
    const testCases = fs.readdirSync(testCasesBasePath); // TODO: order cases
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
    return transformAndPrettyPrint(
        expectedOutputTSX,
        []
    );
}

function compileWithUseCallbackTransform(inputTSX: string) {
    return transformAndPrettyPrint(
        inputTSX,
        [useCallbackTranformer]
    );
}