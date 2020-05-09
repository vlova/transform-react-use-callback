import { expect } from 'chai';
import { useCallbackTranformer } from '../useCallbackTransformer';
import * as fs from 'fs';
import { transformAndPrettyPrint } from './common';

describe('useCallback', () => {
    const testCasesBasePath = 'tests/useCallbackTestCases';
    const testCases = fs.readdirSync(testCasesBasePath);
    for (const testCaseName of testCases) {
        const inputTSX = fs.readFileSync(`${testCasesBasePath}/${testCaseName}/input.tsx`).toString();
        const outputTSX = fs.readFileSync(`${testCasesBasePath}/${testCaseName}/output.tsx`).toString();
        it(testCaseName, () => {
            const expectedOutputTSX = transformAndPrettyPrint(outputTSX, []);
            const actualOutputTSX = transformAndPrettyPrint(inputTSX, [useCallbackTranformer]);
            expect(actualOutputTSX).equal(expectedOutputTSX);
        });
    }
});