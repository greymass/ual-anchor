import {
  Authenticator, ButtonStyle, Chain,
  UALError, UALErrorType, User
} from 'universal-authenticator-library'

import AnchorLink from 'anchor-link'
import { Name } from './interfaces'
import { AnchorUser } from './AnchorUser'
import { AnchorLogo } from './AnchorLogo'
import { UALAnchorError } from './UALAnchorError'
import AnchorLinkBrowserTransport from 'anchor-link-browser-transport'
import AnchorLinkLocalStoragePersist from 'anchor-link-localstorage-persist'

export class Anchor extends Authenticator {
  private users: AnchorUser[] = []
  private appName: string

  private anchorIsLoading: boolean
  private link?: any
  private service: string
  private chainId: string

  // private session?: LinkSession;

  /**
   * Anchor Constructor.
   *
   * @param chains
   * @param options { appName } appName is a required option to use Scatter
   */
  constructor(chains: Chain[], options?: any) {
    super(chains)

    // Establish sessions for persistence
    this.anchorIsLoading = true
    this.chainId = chains[0].chainId
    this.service = options.service || 'https://cb.anchor.link';
    this.users = []

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
    this.anchorIsLoading = true

    // establish anchor-link
    const [chain] = this.chains
    const [rpc] = chain.rpcEndpoints
    this.link = new AnchorLink({
      chainId: this.chainId,
      rpc: `${rpc.protocol}://${rpc.host}:${rpc.port}`,
      service: this.service,
      storage: new AnchorLinkLocalStoragePersist(),
      transport: new AnchorLinkBrowserTransport({ requestStatus: false }),
    })

    // attempt to restore existing session
    const session = await this.link.restoreSession(this.appName);
    if (session) {
      this.users = [new AnchorUser(chain, session)]
    }

    this.anchorIsLoading = false
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
    return this.anchorIsLoading
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
    return this.isLoading()
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
  async login(): Promise<User[]> {
    if (this.chains.length > 1) {
      throw new UALAnchorError('UAL-Anchor does not yet support providing multiple chains to UAL. Please initialize the UAL provider with a single chain.',
        UALErrorType.Unsupported,
        null)
    }
    try {
      if (this.users.length === 0) {
        const [chain] = this.chains
        const identity = await this.link.login(this.appName)
        this.users = [new AnchorUser(chain, identity.session)]
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
    await this.link.removeSession(this.appName);
    this.reset()
  }

  /**
   * Returns true if user confirmation is required for `getKeys`
   */
  public requiresGetKeyConfirmation(): boolean {
    return false
  }
}
