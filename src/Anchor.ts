import {
  Authenticator, ButtonStyle, Chain,
  UALError, UALErrorType, User
} from 'universal-authenticator-library'

import { Link } from 'anchor-link'
import { Name } from './interfaces'
import { AnchorUser } from './AnchorUser'
import { AnchorLogo } from './AnchorLogo'
import { UALAnchorError } from './UALAnchorError'
import BrowserTransport from 'anchor-link-browser-transport'

export class Anchor extends Authenticator {
  private users: AnchorUser[] = []
  private anchor: any
  private appName: string

  /**
   * Anchor Constructor.
   *
   * @param chains
   * @param options { appName } appName is a required option to use Scatter
   */
  constructor(chains: Chain[], options?: any) {
    super(chains)
    if (options && options.appName) {
      this.appName = options.appName
    } else {
      throw new UALAnchorError('Anchor requires the appName property to be set on the `options` argument.',
        UALErrorType.Initialization,
        null)
    }
  }

  /**
   * Called after `shouldRender` and should be used to handle any async actions required to initialize the authenticator
   */
  async init() {
    const [chain] = this.chains
    const [rpc] = chain.rpcEndpoints
    this.anchor = new Link({
      chainId: chain.chainId,
      rpc: `${rpc.protocol}://${rpc.host}:${rpc.port}`,
      service: 'https://cb.anchor.link',
      transport: new BrowserTransport()
    })
  }

  /**
   * Resets the authenticator to its initial, default state then calls `init` method
   */
  reset() {

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
   * Returns the amount of seconds after the authentication will be invalid for logging in on new
   * browser sessions.  Setting this value to zero will cause users to re-attempt authentication on
   * every new browser session.  Please note that the invalidate time will be saved client-side and
   * should not be relied on for security.
   */
  shouldInvalidateAfter() {
    return 0
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
       background: '#021b72'
     }
   }


  /**
   * Returns whether or not the button should render based on the operating environment and other factors.
   * ie. If your Authenticator App does not support mobile, it returns false when running in a mobile browser.
   */
  shouldRender() {
    return true
  }


  /**
   * Returns whether or not the dapp should attempt to auto login with the Authenticator app.
   * Auto login will only occur when there is only one Authenticator that returns shouldRender() true and
   * shouldAutoLogin() true.
   */
  shouldAutoLogin() {
    return false
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
  async login(): Promise<User[]> {
    if (this.chains.length > 1) {
      throw new UALAnchorError('UAL-Anchor does not yet support providing multiple chains to UAL. Please initialize the UAL provider with a single chain.',
        UALErrorType.Unsupported,
        null)
    }
    try {
      if (this.users.length > 0) {
        console.log("returning session users", this.users)
        return this.users
      }
      const [chain] = this.chains
      const identity = await this.link.login(this.appName)
      await this.storage.store(identity.session, this.sessionId);
      this.users = [new AnchorUser(chain, identity.session)]
      return this.users
    } catch (e) {
      throw new UALAnchorError(
        e.message,
        UALErrorType.Login,
        e)
    }
  }


  /**
   * Logs the user out of the dapp. This will be strongly dependent on each Authenticator app's patterns.
   */
  async logout(): Promise<void>  {
    window.localStorage.removeItem('UALLoggedInAuthType')
    window.localStorage.removeItem('UALAccountName')
  }

  /**
   * Returns true if user confirmation is required for `getKeys`
   */
  public requiresGetKeyConfirmation(): boolean {
    return false
  }
}
