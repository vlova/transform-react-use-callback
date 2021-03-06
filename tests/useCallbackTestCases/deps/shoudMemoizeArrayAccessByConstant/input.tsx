import * as React from 'react';

export const MyCounter = (p: { adders: number[] }) => {
    const [counter, setCounter] = React.useState(0);

    return (
        <div>
            <span style={{ color: 'red' }}>{counter}</span>
            <button onClick={() => setCounter(counter + p.adders[0])}>+</button>
        </div>
    )
}