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
    this.users = []
    try {
      for (const chain of this.chains) {
        const identity = await this.anchor.login(this.appName)
        this.users = [new AnchorUser(chain, identity)]
      }
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
