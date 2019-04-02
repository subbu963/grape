![GrapeJS](/logos/icon-left-font.png)

It's a React-ish library for building UI's. It uses virtual dom underneath and follows somewhat similar api. I started this initially cause I was fascinated by virtual dom and wanted to learn and experiment with it.

## Features
- Lightweight(~7.6 KB gzipped and minified)
- Server side rendering

## Installation
```bash
$ yarn add https://github.com/terio/grape
$ yarn add https://github.com/terio/babel-preset-grape --dev
```

## Basics
### Components
Components can implement their own `render` method. Without which it will render a empty component.

GrapeJS supports writing html and css attributes with their actual name unlike React. We can just `class` instead of `className`, 'onclick' instead of `onClick`, etc
```javascript
import grape, {Component} from 'grape';

class Hello extends Component {
    onHelloClick() {}
    render() {
        return (
            <div class="hello" onclick={this.onHelloClick.bind(this)}>Hello World!</div>
        );
    }
}
```
You can get the `props` from `this.props`, `state` from `this.state` and `children` from `this.children`.

You can use a list of JSX nodes similar to React. We need to pass key for every child component.
```javascript
import grape, {Component} from 'grape';

class List extends Component {
    render() {
        return (
            <ul>{this.props.items.map(item => <li key={item.id}>{item.text}</li>)}</ul>
        );
    }
}
```
Components can set state using `this.setState`
```javascript
import grape, {Component} from 'grape';

class Button extends Component {
    constructor(...args) {
        super(...args);
        this.state = {
            color: 'red'
        };
    }
    toggleColor() {
        this.setState({
            color: this.state.color === 'red' ? 'blue': 'red'
        });
    }
    render() {
        return (
            <button style={{'background-color':this.state.color}} onclick={this.toggleColor.bind(this)}>Click me</button>
        );
    }
}
```
GrapeJS only has two lifecycle hooks - `mounted` for when the component is mounted and `willUnmount` for when component is going to be removed from dom.

```javascript
import grape, {Component} from 'grape';

class Counter extends Component {
    constructor(...args) {
        super(...args);
        this.state = {
            counter: 0
        };
    }
    mounted() {
        this.interval = window.setInterval(() => this.setState({
            counter: this.state.counter + 1
        }));
    }
    willUnmount() {
        window.clearInterval(this.interval);
    }
    render() {
        return (
            <p>{this.state.counter}</p>
        );
    }
}
```
Server side rendering:
```javascript
import {renderToString} from 'grape/lib/dom/server';
import grape from 'grape';
import App from '../client/components/app';

const html = renderToString(<App/>, true);
```
## Stats
Currently the library weighs around ~ 7.6 KB gzipped and minified compared to React which ~ 49.8 KB. GrapeJS has a lot less features and is still in early stages. We should able to squeeze the size lot more by removing a lot of ES6 code that is used without compromising on performance.
