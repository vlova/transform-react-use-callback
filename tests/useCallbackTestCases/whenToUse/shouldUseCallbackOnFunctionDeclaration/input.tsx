import * as React from 'react';

export const MyCounter = (p: { multiplier: number }) => {
    const [counter, setCounter] = React.useState(0);

    function increment() { setCounter(counter + 1) }

    return (
        <div>
            <span style={{ color: 'red' }}>{counter}</span>
            <button onClick={increment}>+</button>
        </div>
    )
};