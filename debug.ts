import { transformFile, Transformer } from "ts-transformer-testing-library";
import { useCallbackTranformer } from './useCallbackTransformer';
import * as fs from 'fs';
import { inlineFile } from './common';

const reactTypes = fs.readFileSync('node_modules/@types/react/index.d.ts');

const transformed = transformFile({
    path: '/index.tsx',
    contents: inlineFile`
        import * as React from 'react';

        export const MyCounter = (p: {multiplier: number}) => {
            const [counter, setCounter] = React.useState(0);

            return (
                <div>
                    <span style={{color: 'red'}}>{counter}</span>
                    <button onClick={() => setCounter(counter+1)}>+</button>
                    <button onClick={() => setCounter(c => c-1)}>-</button>
                    <button onClick={() => setCounter(c => c * p.multiplier)}>*</button>
                    {[0, 1].map(i => <div key={i} />)}
                </div>
            )
        };
    `
}, {
    transforms: [useCallbackTranformer],
    mocks: [
        {
            name: 'react',
            content: reactTypes.toString()
        }
    ]
});

console.log(transformed);