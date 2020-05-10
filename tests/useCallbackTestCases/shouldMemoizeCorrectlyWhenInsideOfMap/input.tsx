import * as React from 'react';

export const TodoItems = (p: {
    items: { id: string, title: string }[],
    removeItem: (id: string) => void
}) => (
        <div>
            {
                p.items.map(item => (
                    <div key={item.id}>
                        {item.title}
                        <button
                            onClick={(e) => p.removeItem((e.target as HTMLButtonElement).dataset.id)}
                            data-id={item.id}>
                            x
                        </button>
                    </div>
                ))
            }
        </div>
    );