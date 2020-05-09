import * as React from 'react';

export const MyCounter = (p: { multiplier: number }) => {
    const [counter, setCounter] = React.useState(0);
    const increment = React.useCallback(() => setCounter(counter + 1), [counter, setCounter]);

    return (
        <button onClick={React.useCallback(() => increment(), [increment])}>+</button>
    )
};