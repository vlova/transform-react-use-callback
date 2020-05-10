import * as React from 'react';

export const ToggledComponent = (p: { show: boolean }) => {
    return p.show && (
        <button onClick={() => alert('hi')}>
            Say hi
        </button>
    );
}