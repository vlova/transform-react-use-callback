import * as React from 'react';

export const ToggledComponent = (p: {
    show: true,
    message?: string
}) => {
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