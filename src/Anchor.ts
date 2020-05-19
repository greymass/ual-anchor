import {
  Authenticator, ButtonStyle, Chain,
  UALError, UALErrorType, User
} from 'universal-authenticator-library'

import AnchorLink from 'anchor-link'
import { JsonRpc } from 'eosjs'
import { Name } from './interfaces'
import { AnchorUser } from './AnchorUser'
import { AnchorLogo } from './AnchorLogo'
import { UALAnchorError } from './UALAnchorError'
import AnchorLinkBrowserTransport from 'anchor-link-browser-transport'

export class Anchor extends Authenticator {
  // Storage for AnchorUser instances
  private users: AnchorUser[] = []
  // The app name, required by anchor-link
  private appName: string
  // storage for the anchor-link instance
  private link?: any
  // a string to pass to JsonRpc or a JsonRpc instance that should be utilized
  private rpc: string | JsonRpc
  // the callback service url
  private service: string
  // the chainId currently in use
  private chainId: string

  /**
   * Anchor Constructor.
   *
   * @param chains
   * @param options { appName } appName is a required option to use Scatter
   */
  constructor(chains: Chain[], options?: any) {
    super(chains)
    // Establish initial values
    this.chainId = chains[0].chainId
    this.service = options.service || 'https://cb.anchor.link';
    this.users = []
    // Determine the default rpc endpoint for this chain
    const [chain] = chains
    const [rpc] = chain.rpcEndpoints
    this.rpc = `${rpc.protocol}://${rpc.host}:${rpc.port}`
    // Ensure the appName is set properly
    if (options && options.appName) {
      this.appName = options.appName
    } else {
      throw new UALAnchorError('ual-anchor requires the appName property to be set on the `options` argument during initialization.',
        UALErrorType.Initialization,
        null)
    }
    // Allow overriding the JsonRpc client
    if (options && options.rpc) {
      const rpc = options.rpc
      // A hack for eosjs to resolve the "illegal invocation" errors while fetching
      //    this can be removed in the future once the issue is resolve in anchor-link, but shouldn't cause harm in the mean time
      if (rpc.fetchBuiltin) {
        rpc.fetchBuiltin = rpc.fetchBuiltin.bind(window)
      }
      this.rpc = rpc
    }
  }

  /**
   * Called after `shouldRender` and should be used to handle any async actions required to initialize the authenticator
   */
  async init() {
    // establish anchor-link
    this.link = new AnchorLink({
      chainId: this.chainId,
      rpc: this.rpc,
      service: this.service,
      transport: new AnchorLinkBrowserTransport({
        // disable browser transport UI status messages, ual has its own
        requestStatus: false
      }),
    })
    // attempt to restore any existing session for this app
    const session = await this.link.restoreSession(this.appName);
    if (session) {
      this.users = [new AnchorUser(this.rpc, session)]
    }
  }

  /**
   * Resets the authenticator to its initial, default state then calls `init` method
   */
  reset() {
    this.users = []
  }


  /**
   * Returns true if the authenticator has errored while initializing.
   */
  isErrored() {
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
  getError(): UALError | null {
    return null
  }


  /**
   * Returns true if the authenticator is loading while initializing its internal state.
   */
  isLoading() {
    return false
  }


  /**
   * Returns the style of the Button that will be rendered.
   */
   getStyle(): ButtonStyle {
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
  shouldRender() {
    return !this.isLoading()
  }


  /**
   * Returns whether or not the dapp should attempt to auto login with the Authenticator app.
   * Auto login will only occur when there is only one Authenticator that returns shouldRender() true and
   * shouldAutoLogin() true.
   */
  shouldAutoLogin() {
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
  async login(accountName?: string): Promise<User[]> {
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
        this.users = [new AnchorUser(this.rpc, identity.session)]
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
  async logout(): Promise<void>  {
    // retrieve the current user
    const [user] = this.users
    // retrieve the auth from the current user
    const { session: { auth } } = user
    // remove the session from anchor-link
    await this.link.removeSession(this.appName, auth);
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
