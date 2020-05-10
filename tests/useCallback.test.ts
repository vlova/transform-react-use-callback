import { expect } from 'chai';
import { useCallbackTranformer } from '../useCallbackTransformer';
import * as fs from 'fs';
import { transformAndPrettyPrint } from './common';


const testCasesBasePath = 'tests/useCallbackTestCases';
const testCaseGroups = fs.readdirSync(testCasesBasePath);

describe('useCallback', () => {
    for (const testCaseGroup of testCaseGroups) {
        describe(testCaseGroup, () => {
            const testCasesBasePath = `tests/useCallbackTestCases/${testCaseGroup}`;
            const testCases = fs.readdirSync(testCasesBasePath);
            for (const testCaseName of testCases) {
                const inputTSX = fs.readFileSync(`${testCasesBasePath}/${testCaseName}/input.tsx`);
                const outputTSX = fs.readFileSync(`${testCasesBasePath}/${testCaseName}/output.tsx`);
                it(testCaseName, () => {
                    const expectedOutputTSX = transformAndPrettyPrint(outputTSX.toString(), []);
                    const actualOutputTSX = transformAndPrettyPrint(inputTSX.toString(), [useCallbackTranformer]);
                    expect(actualOutputTSX).equal(expectedOutputTSX);
                });
            }
        });
    }
});