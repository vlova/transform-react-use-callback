import * as React from 'react';

export const MyCounter = () => {
    const [counter, setCounter] = React.useState(0);

    return (
        <div>
            <span style={{ color: 'red' }}>{counter}</span>
            <button onClick={React.useCallback(makeIncrement(setCounter), [setCounter])}>+</button>
        </div>
    )
};

const makeIncrement = (setCounter: React.Dispatch<React.SetStateAction<number>>) => {
    return () => setCounter(c => c + 1);
}