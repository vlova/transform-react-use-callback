import * as React from 'react';

export const MyCounter = () => (
    <div>
        <button onClick={makeLog()}>+</button>
    </div>
)

function makeLog() {
    return () => console.log('hi');
}