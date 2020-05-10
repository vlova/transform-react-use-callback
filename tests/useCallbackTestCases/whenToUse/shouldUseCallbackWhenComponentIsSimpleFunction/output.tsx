import * as React from 'react';

export function MyCounter(p: { multiplier: number }) {
    const [counter, setCounter] = React.useState(0);

    return (
        <div>
            <span style={{ color: 'red' }}>{counter}</span>
            <button onClick={React.useCallback(() => setCounter(counter + 1), [counter, setCounter])}>+</button>
        </div>
    )
};