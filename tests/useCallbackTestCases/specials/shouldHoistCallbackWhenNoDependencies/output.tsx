import * as React from 'react';

const $myHoistedCallback0 = () => console.log('hello world');
export const Something = () => (
    <div>
        <button onClick={$myHoistedCallback0}>Hello</button>
    </div>
);