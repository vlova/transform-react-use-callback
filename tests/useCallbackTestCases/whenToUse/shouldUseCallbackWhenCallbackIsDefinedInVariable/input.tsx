import * as React from 'react';

export const MyCounter = (p: { multiplier: number }) => {
    const [counter, setCounter] = React.useState(0);
    const increment = () => setCounter(counter + 1);

    return (
        <button onClick={increment}>+</button>
    )
};