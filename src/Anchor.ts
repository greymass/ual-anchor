import {
  Authenticator, ButtonStyle, Chain,
  UALError, UALErrorType, User
} from 'universal-authenticator-library'

import { Link, LinkSession  } from 'anchor-link'
import { Name } from './interfaces'
import { AnchorUser } from './AnchorUser'
import { AnchorLogo } from './AnchorLogo'
import { UALAnchorError } from './UALAnchorError'
import BrowserTransport from 'anchor-link-browser-transport'

export class Anchor extends Authenticator {
  private users: AnchorUser[] = []
  private appName: string

  private anchorIsLoading: boolean
  private link?: any
  private service: string
  private sessionId: string
  private storage: SessionStorage

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
    this.storage = options.sessionStorage || new LocalSessionStorage();
    this.service = options.service || 'https://cb.anchor.link';
    this.sessionId = chains[0].chainId
    this.users = []

    if (options && options.appName) {
      this.appName = `${options.appName}-${chains[0].chainId}`
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
    this.link = new Link({
      chainId: chain.chainId,
      rpc: `${rpc.protocol}://${rpc.host}:${rpc.port}`,
      service: this.service,
      transport: new BrowserTransport()
    })

    // attempt to restore existing session
    const session = this.storage.restore(
      this.link,
      this.sessionId
    );
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
        await this.storage.store(identity.session, this.sessionId);
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
    await this.storage.remove(this.sessionId);
    this.reset()
  }

  /**
   * Returns true if user confirmation is required for `getKeys`
   */
  public requiresGetKeyConfirmation(): boolean {
    return false
  }
}

interface SessionStorage {
  store(session: LinkSession, id: string, accountName?: string): Promise<void>;
  restore(
    link: Link,
    id: string,
    accountName?: string
  ): LinkSession | null;
  remove(id: string, accountName?: string): Promise<void>;
}

class LocalSessionStorage implements SessionStorage {
  constructor(readonly keyPrefix: string = 'anchorlink') {}

  private sessionKey(id: string, accountName?: string) {
    return [this.keyPrefix, id, accountName]
      .filter(v => typeof v === 'string' && v.length > 0)
      .join('-');
  }

  async store(session: LinkSession, id: string, accountName?: string) {
    const key = this.sessionKey(id, accountName);
    const data = session.serialize();
    localStorage.setItem(key, JSON.stringify(data));
  }

  restore(link: Link, id: string, accountName?: string) {
    const key = this.sessionKey(id, accountName);
    const data = JSON.parse(localStorage.getItem(key) || 'null');
    if (data) {
      return LinkSession.restore(link, data);
    }
    return null;
  }

  async remove(id: string, accountName?: string) {
    localStorage.removeItem(this.sessionKey(id, accountName));
  }
}
