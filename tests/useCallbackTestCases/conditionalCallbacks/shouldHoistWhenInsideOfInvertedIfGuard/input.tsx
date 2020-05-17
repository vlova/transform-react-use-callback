import * as React from 'react';

export const ToggledComponent = (p: ShowProps) => {
    if (!p.show) {
        return <></>;
    }

    return (
        <button onClick={() => alert(p.message)}>
            Say hi
        </button>
    )
}

type ShowProps = {
    show: true,
    message: string
} | {
    show: false
}