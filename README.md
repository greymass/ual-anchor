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

#### Basic usage and configuration with React

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

const anchor = new Anchor([exampleNet], {
  // Required: The app name, required by anchor-link. Short string identifying the app
  appName: 'Example App',
  // Optional: a JsonRpc instance from eosjs to use internally
  rpc: new JsonRpc(),
  // Optional: The callback service URL to use, defaults to https://cb.anchor.link
  service: 'https://cb.anchor.link',
  // Optional: A flag to disable the Greymass Fuel integration, defaults to false (enabled)
  disableGreymassFuel: false,
  // Optional: A flag to enable the Anchor Link UI request status, defaults to false (disabled)
  requestStatus: false,  
})

<UALProvider chains={[exampleNet]} authenticators={[anchor]}>
  <AppWithUAL />
</UALProvider>
```

## License

[MIT](https://github.com/EOSIO/ual-anchor/blob/develop/LICENSE)
