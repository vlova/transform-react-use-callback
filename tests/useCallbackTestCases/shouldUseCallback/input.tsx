import * as React from 'react';

export const MyCounter = (p: { multiplier: number }) => {
    const [counter, setCounter] = React.useState(0);

    return (
        <div>
            <span style={{ color: 'red' }}>{counter}</span>
            <button onClick={() => setCounter(c => c + 1)}>+</button>
        </div>
    )
};