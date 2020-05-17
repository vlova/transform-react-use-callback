import * as React from 'react';

export const ToggledComponent = (p: {
    show: true,
    message?: string
}) => {
    const $myHoistedCallback_1 = React.useCallback(
        () => {
            alert(p.message);
        },
        [p.message]);

    if (p.show) {
        return (
            <button onClick={$myHoistedCallback_1}>
                Say hi
            </button>
        )
    } else {
        return <></>;
    }
}