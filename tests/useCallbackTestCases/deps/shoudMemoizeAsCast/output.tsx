import * as React from 'react';

export const MyCounter = (p: { adder: number }) => {
    const [counter, setCounter] = React.useState(0);

    return (
        <div>
            <span style={{ color: 'red' }}>{counter}</span>
            <button onClick={React.useCallback(() => setCounter(counter + (p as any)), [(p as any), counter, setCounter])}>+</button>
        </div>
    )
};