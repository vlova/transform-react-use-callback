import * as React from 'react';

export const ToggledComponent = (p: { show: boolean }) => {
    const $myHoistedCallback0 = React.useCallback(
        () => {
            if (p.show) {
                alert('Hi');
            }
        },
        [p.show]);


    return p.show && (
        <button onClick={$myHoistedCallback0}>
            Say hi
        </button>
    );
}