import * as React from 'react';

export const ToggledComponent = (p: { show: boolean }) => {
    if (p.show) {
        return (
            <button onClick={() => alert('hi')}>
                Say hi
            </button>
        )
    } else {
        return <></>;
    }
}