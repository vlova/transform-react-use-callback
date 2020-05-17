import * as React from 'react';

export const ToggledComponent = (p: ShowProps) => {
    return p.show
        ? (
            <button onClick={() => alert(p.message)}>
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