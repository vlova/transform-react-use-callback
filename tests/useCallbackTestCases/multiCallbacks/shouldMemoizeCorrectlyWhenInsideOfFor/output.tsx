import * as React from 'react';

export const TodoItems = (p: {
    items: { id: string, title: string }[],
    removeItem: (id: string) => void
}) => {
    const $myHoistedCallback0 = React.useCallback(
        (e) => p.removeItem((e.target as HTMLButtonElement).dataset.id),
        [p.removeItem]
    );

    const mappedItems = [];
    for (const item of p.items) {
        mappedItems.push(
            <div key={item.id}>
                {item.title}
                <button
                    onClick={$myHoistedCallback0}
                    data-id={item.id}>
                    x
                </button>
            </div>
        );
    }

    return (
        <div>
            {mappedItems}
        </div>
    );
}