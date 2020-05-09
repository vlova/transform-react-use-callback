import * as React from 'react';

export const MyCounter = (p: { multiplier: number }) => {
    const [counter, setCounter] = React.useState(0);

    return (
        <div>
            <span style={{ color: 'red' }}>{counter}</span>
            <button onClick={React.useCallback(() => setCounter(counter + 1), [setCounter, counter])}>+</button>
        </div>
    )
};