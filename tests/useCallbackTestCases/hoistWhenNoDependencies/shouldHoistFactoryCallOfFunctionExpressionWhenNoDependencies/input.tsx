import * as React from 'react';

export const MyCounter = () => (
    <div>
        <button onClick={makeLog()}>+</button>
    </div>
)

const makeLog = () => {
    return () => console.log('hi');
}