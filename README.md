# UAL for Anchor Authenticator

This authenticator is meant to be used with [Anchor](https://github.com/greymass/anchor/) and [Universal Authenticator Library](https://github.com/EOSIO/universal-authenticator-library). When used in combination with them, it gives developers the ability to request transaction signatures through Anchor using the common UAL API.

## Supported Environments

- The Anchor Authenticator only supports both Desktop and Mobile environments

## Getting Started

`yarn add ual-anchor`

#### Dependencies

You must use one of the UAL renderers below.

React - `ual-reactjs-renderer`  
PlainJS - `ual-plainjs-renderer`

#### Basic Usage with React

```javascript
import { Anchor } from 'ual-anchor'
import { UALProvider, withUAL } from 'ual-reactjs-renderer'

const exampleNet = {
  chainId: '',
  rpcEndpoints: [{
    protocol: '',
    host: '',
    port: '',
  }]
}

const App = (props) => <div>{JSON.stringify(props.ual)}</div>
const AppWithUAL = withUAL(App)

const anchor = new Anchor([exampleNet], { appName: 'Example App' })

<UALProvider chains={[exampleNet]} authenticators={[anchor]}>
  <AppWithUAL />
</UALProvider>
```

## License

[MIT](https://github.com/EOSIO/ual-anchor/blob/develop/LICENSE)
