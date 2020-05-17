import * as React from 'react';

export const ToggledComponent = (p: ShowProps) => {
    const $myHoistedCallback_1 = React.useCallback(
        () => {
            alert((p as any).message);
        },
        [(p as any).message]);

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

type ShowProps = {
    show: true,
    message: string
} | {
    show: false
}