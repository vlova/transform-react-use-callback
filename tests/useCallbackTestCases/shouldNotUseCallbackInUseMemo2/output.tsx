import * as React from 'react';

export const MyCounter = () => (
    <div>
        <span style={React.useMemo(() => ({ color: 'red' }), [])}>Text</span>
    </div>
)