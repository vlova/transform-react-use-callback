import * as React from 'react';

export const ToggledComponent = (p: ShowProps) => {
    const $myHoistedCallback0 = React.useCallback(
        () => {
            alert((p as any).message);
        },
        [(p as any).message]);


    return p.show
        ? (
            <button onClick={$myHoistedCallback0}>
                Say hi
            </button>
        )
        : <></>;
}

type ShowProps = {
    show: true,
    message: string
} | {
    show: false
}