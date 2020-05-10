import * as React from 'react';

export const MyCounter = () => {
    const [counter, setCounter] = React.useState(0);

    return (
        <div>
            <span style={{ color: 'red' }}>{counter}</span>
            <button onClick={useMyCustomCallback(() => setCounter(counter + 1))}>+</button>
        </div>
    )
};

export function useMyCustomCallback(callback?: () => void) {
    return callback;
}