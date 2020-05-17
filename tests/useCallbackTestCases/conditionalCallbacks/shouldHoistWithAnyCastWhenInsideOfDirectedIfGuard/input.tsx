import * as React from 'react';

type ShowProps
    = {
        show: true,
        message: string
    } | {
        show: false
    }

export const ToggledComponent = (p: ShowProps) => {
    if (p.show) {
        return (
            <button onClick={() => alert(p.message)}>
                Say hi
            </button>
        )
    } else {
        return <></>;
    }
}