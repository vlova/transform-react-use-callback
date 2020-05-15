import * as React from 'react';

export const Something = () => {
    function log() { console.log('hello world'); }

    return (
        <div>
            <button onClick={log}>Hello</button>
        </div>
    );
}