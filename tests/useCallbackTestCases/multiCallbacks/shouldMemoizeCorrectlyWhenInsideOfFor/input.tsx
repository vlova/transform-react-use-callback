import * as React from 'react';

export const TodoItems = (p: {
    items: { id: string, title: string }[],
    removeItem: (id: string) => void
}) => {
    const mappedItems = [];
    for (const item of p.items) {
        mappedItems.push(
            <div key={item.id}>
                {item.title}
                <button
                    onClick={(e) => p.removeItem((e.target as HTMLButtonElement).dataset.id)}
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
};