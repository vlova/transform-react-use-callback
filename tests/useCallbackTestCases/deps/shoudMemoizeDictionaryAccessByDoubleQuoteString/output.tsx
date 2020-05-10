import * as React from 'react';

export const MyCounter = (p: { adders: { [key: string]: number } }) => {
    const [counter, setCounter] = React.useState(0);

    return (
        <div>
            <span style={{ color: 'red' }}>{counter}</span>
            <button onClick={React.useCallback(() => setCounter(counter + p.adders["key"]), [setCounter, counter, p.adders["key"]])}>+</button>
        </div>
    )
};