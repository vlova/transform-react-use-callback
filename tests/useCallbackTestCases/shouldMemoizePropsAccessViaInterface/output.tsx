import * as React from 'react';

interface Props {
    adder: number;
}

export const MyCounter = (p: Props) => {
    const [counter, setCounter] = React.useState(0);

    return (
        <div>
            <span style={{ color: 'red' }}>{counter}</span>
            <button onClick={React.useCallback(() => setCounter(counter + p.adder), [setCounter, counter, p.adder])}>+</button>
        </div>
    )
};