import * as React from 'react';

export const ToggledComponent = (p: {
    show: true,
    message?: string
}) => {
    const $myHoistedCallback_1 = React.useCallback(
        () => {
            const message1 = p.message;
            const message2 = message1 + ' hi';
            alert(message2);
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