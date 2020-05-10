import * as React from 'react';

export const HiComponent = (p: { do?: () => void }) => {
    return (
        <button onClick={p.do ?? (() => alert('hi'))}>
            Say hi
        </button>
    );
}