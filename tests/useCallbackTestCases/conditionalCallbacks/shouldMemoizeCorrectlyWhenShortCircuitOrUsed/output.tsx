import * as React from 'react';

export const HiComponent = (p: { do?: () => void }) => {
    const $myHoistedCallback0 = React.useCallback(
        () => {
            if (p.do) {
                p.do();
                return;
            }

            alert('Hi');
        },
        [p.do]);


    return (
        <button onClick={$myHoistedCallback0}>
            Say hi
        </button>
    );
}