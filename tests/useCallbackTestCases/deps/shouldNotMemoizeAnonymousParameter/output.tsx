import * as React from 'react';

export const MyCounter = () => {
    const [counter, setCounter] = React.useState(0);

    return (
        <div>
            <span style={{ color: 'red' }}>{counter}</span>
            <button onClick={React.useCallback(() => setCounter(c => c + 1), [setCounter])}>+</button>
        </div>
    )
};