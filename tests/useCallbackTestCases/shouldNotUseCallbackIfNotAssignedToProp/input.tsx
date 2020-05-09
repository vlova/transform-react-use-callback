import * as React from 'react';

export const TodoItems = (p: { items: { id: string, title: string }[] }) =>
    <div>
        <h1>Items</h1>
        {
            p.items.map(item => (
                <TodoItem key={item.id} title={item.title} />
            ))
        }
    </div>

const TodoItem = (p: { title: string }) => <>p.title</>;