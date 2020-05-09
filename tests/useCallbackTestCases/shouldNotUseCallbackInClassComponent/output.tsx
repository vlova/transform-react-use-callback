import * as React from 'react';

class SomeComponent extends React.Component<{ do: () => void }> {
    render() {
        return <button onClick={() => this.props.do()}>Do something</button>
    }
}