import * as React from 'react';

const $myHoistedCallback_1 = function () { console.log('hello world'); }

export const Something = () => (
    <div>
        <button onClick={$myHoistedCallback_1}>Hello</button>
    </div>
);