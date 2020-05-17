import * as React from 'react';

export const ToggledComponent = (p: {
    show: true,
    message?: string
}) => {
    if (p.show) {
        const message1 = p.message;
        const message2 = message1 + ' hi';
        return (
            <button onClick={() => alert(message2)}>
                Say hi
            </button>
        )
    } else {
        return <></>;
    }
}