import * as React from 'react';

export const MyCounter = (p: { multiplier: number }) => {
    const [counter, setCounter] = React.useState(0);

    const increment = React.useCallback(
        function increment() { setCounter(counter + 1) },
        [counter, setCounter]);

    return (
        <div>
            <span style={{ color: 'red' }}>{counter}</span>
            <button onClick={increment}>+</button>
        </div>
    )
};