import * as React from 'react';

class SomeComponent extends React.PureComponent<{ do: () => void }> {
    render() {
        const doSomething = this.props.do;
        return (
            <button onClick={() => doSomething()}>
                Do something
            </button>
        );
    }
}