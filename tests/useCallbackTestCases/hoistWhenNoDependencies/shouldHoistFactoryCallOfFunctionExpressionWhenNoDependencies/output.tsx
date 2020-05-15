import * as React from 'react';

export const MyCounter = () => (
    <div>
        <button onClick={$myHoistedCallback_1}>+</button>
    </div>
)

const makeLog = () => {
    return () => console.log('hi');
}

const $myHoistedCallback_1 = makeLog();