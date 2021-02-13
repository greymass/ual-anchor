import {
  Authenticator, ButtonStyle, Chain,
  UALError, UALErrorType, User
} from 'universal-authenticator-library'

import AnchorLink from 'anchor-link'
import { JsonRpc } from 'eosjs'
import { APIClient, FetchProvider } from '@greymass/eosio'
import { Name } from './interfaces'
import { AnchorUser } from './AnchorUser'
import { AnchorLogo } from './AnchorLogo'
import { UALAnchorError } from './UALAnchorError'
import AnchorLinkBrowserTransport from 'anchor-link-browser-transport'

export interface UALAnchorOptions {
  // The app name, required by anchor-link. Short string identifying the app
  appName: string
  // A APIClient object from @greymass/eosio. If not specified, it'll be created using the JsonRpc endpoint
  client?: APIClient
  // Either a JsonRpc instance from eosjs or the url for an API to connect a new JsonRpc instance to
  rpc?: JsonRpc
  // The callback service URL to use, defaults to https://cb.anchor.link
  service?: string
  // A flag to disable the Greymass Fuel integration, defaults to false (enabled)
  disableGreymassFuel?: boolean
  // A flag to enable the Anchor Link UI request status, defaults to false (disabled)
  requestStatus?: boolean
  // An account name to use as the referral account for Fuel
  fuelReferrer?: string
  // Whether anchor-link should be configured to verify identity proofs in the browser for the app
  verifyProofs?: boolean
}

export class Anchor extends Authenticator {
  // a JsonRpc instance that can be utilized
  public rpc: JsonRpc
  // a APIClient instance that can be utilized
  public client: APIClient
  // Storage for AnchorUser instances
  private users: AnchorUser[] = []
  // The app name, required by anchor-link
  private appName: string
  // storage for the anchor-link instance
  private link?: any
  // the callback service url, defaults to https://cb.anchor.link
  private service: string = 'https://cb.anchor.link'
  // the chainId currently in use
  private chainId: string
  // disable Greymass Fuel cosigning, defaults to false
  private disableGreymassFuel: boolean = false
  // display the request status returned by anchor-link, defaults to false (ual has it's own)
  private requestStatus: boolean = false
  // The referral account used in Fuel transactions
  private fuelReferrer: string = 'teamgreymass'
  // Whether anchor-link should be configured to verify identity proofs in the browser for the app
  private verifyProofs: boolean = false

  /**
   * Anchor Constructor.
   *
   * @param chains
   * @param options { appName } appName is a required option to use Scatter
   */
  constructor(chains: Chain[], options?: UALAnchorOptions) {
    super(chains)
    // Establish initial values
    this.chainId = chains[0].chainId
    this.users = []
    // Determine the default rpc endpoint for this chain
    const [chain] = chains
    const [rpc] = chain.rpcEndpoints
    // Ensure the appName is set properly
    if (options && options.appName) {
      this.appName = options.appName
    } else {
      throw new UALAnchorError('ual-anchor requires the appName property to be set on the `options` argument during initialization.',
        UALErrorType.Initialization,
        null)
    }
    // Allow overriding the JsonRpc client via options
    if (options && options.rpc) {
      this.rpc = options.rpc
    } else {
      // otherwise just return a generic rpc instance for this endpoint
      this.rpc = new JsonRpc(`${rpc.protocol}://${rpc.host}:${rpc.port}`)
    }
    // Allow overriding the APIClient via options
    if (options && options.client) {
      this.client = options.client
    } else {
      const provider = new FetchProvider(`${rpc.protocol}://${rpc.host}:${rpc.port}`)
      this.client = new APIClient({ provider })
    }
    // Allow passing a custom service URL to process callbacks
    if (options.service) {
      this.service = options.service
    }
    // Allow passing of disable flag for Greymass Fuel
    if (options && options.disableGreymassFuel) {
      this.disableGreymassFuel = options.disableGreymassFuel
    }
    // Allow passing of disable flag for resulting request status
    if (options && options.requestStatus) {
      this.requestStatus = options.requestStatus
    }
    // Allow specifying a Fuel referral account
    if (options && options.fuelReferrer) {
      this.fuelReferrer = options.fuelReferrer
    }
    // Allow overriding the proof verification option
    if (options && options.verifyProofs) {
      this.verifyProofs = options.verifyProofs
    }
  }

  /**
   * Called after `shouldRender` and should be used to handle any async actions required to initialize the authenticator
   */
  public async init() {
    // establish anchor-link
    this.link = new AnchorLink({
      chains: [{
        chainId: this.chainId,
        nodeUrl: this.client,
      }],
      service: this.service,
      transport: new AnchorLinkBrowserTransport({
        requestStatus: this.requestStatus,
        disableGreymassFuel: this.disableGreymassFuel,
        fuelReferrer: this.fuelReferrer,
      }),
      verifyProofs: this.verifyProofs,
    })
    // attempt to restore any existing session for this app
    const session = await this.link.restoreSession(this.appName)
    if (session) {
      this.users = [new AnchorUser(this.rpc, this.client, { session })]
    }
  }

  /**
   * Resets the authenticator to its initial, default state then calls `init` method
   */
  public reset() {
    this.users = []
  }

  /**
   * Returns true if the authenticator has errored while initializing.
   */
  public isErrored() {
    return false
  }

  /**
   * Returns a URL where the user can download and install the underlying authenticator
   * if it is not found by the UAL Authenticator.
   */
  public getOnboardingLink(): string {
    return 'https://github.com/greymass/anchor/'
  }

  /**
   * Returns error (if available) if the authenticator has errored while initializing.
   */
  public getError(): UALError | null {
    return null
  }

  /**
   * Returns true if the authenticator is loading while initializing its internal state.
   */
  public isLoading() {
    return false
  }

  public getName() {
    return 'anchor'
  }

  /**
   * Returns the style of the Button that will be rendered.
   */
  public getStyle(): ButtonStyle {
    return {
      icon: AnchorLogo,
      text: Name,
      textColor: 'white',
      background: '#3650A2'
    }
  }

  /**
   * Returns whether or not the button should render based on the operating environment and other factors.
   * ie. If your Authenticator App does not support mobile, it returns false when running in a mobile browser.
   */
  public shouldRender() {
    return !this.isLoading()
  }

  /**
   * Returns whether or not the dapp should attempt to auto login with the Authenticator app.
   * Auto login will only occur when there is only one Authenticator that returns shouldRender() true and
   * shouldAutoLogin() true.
   */
  public shouldAutoLogin() {
    return this.users.length > 0
  }

  /**
   * Returns whether or not the button should show an account name input field.
   * This is for Authenticators that do not have a concept of account names.
   */
  public async shouldRequestAccountName(): Promise<boolean> {
    return false
  }

  /**
   * Login using the Authenticator App. This can return one or more users depending on multiple chain support.
   *
   * @param accountName  The account name of the user for Authenticators that do not store accounts (optional)
   */
  public async login(): Promise<User[]> {
    if (this.chains.length > 1) {
      throw new UALAnchorError('UAL-Anchor does not yet support providing multiple chains to UAL. Please initialize the UAL provider with a single chain.',
        UALErrorType.Unsupported,
        null)
    }
    try {
      // only call the login method if no users exist, to prevent UI from prompting for login during auto login
      //  some changes to UAL are going to be required to support multiple users
      if (this.users.length === 0) {
        const identity = await this.link.login(this.appName)
        this.users = [new AnchorUser(this.rpc, this.client, identity)]
      }
    } catch (e) {
      throw new UALAnchorError(
        e.message,
        UALErrorType.Login,
        e)
    }
    return this.users
  }

  /**
   * Logs the user out of the dapp. This will be strongly dependent on each Authenticator app's patterns.
   */
  public async logout(): Promise<void>  {
    // retrieve the current user
    const [user] = this.users
    // retrieve the auth from the current user
    const { session: { auth } } = user
    // remove the session from anchor-link
    await this.link.removeSession(this.appName, auth, this.chainId)
    // reset the authenticator
    this.reset()
  }

  /**
   * Returns true if user confirmation is required for `getKeys`
   */
  public requiresGetKeyConfirmation(): boolean {
    return false
  }
}
