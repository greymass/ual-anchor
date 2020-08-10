import { SignTransactionResponse, User, UALErrorType } from 'universal-authenticator-library'
import { JsonRpc } from 'eosjs'

import { UALAnchorError } from './UALAnchorError'

export class AnchorUser extends User {
  public rpc: JsonRpc
  public session: any

  public signerKey?: string
  public signerProof?: string
  public signerRequest?: any

  private signatureProvider: any
  private chainId: string
  private accountName: string = ''
  private requestPermission: string = ''

  constructor(rpc, identity) {
    super()
    const { session } = identity
    this.accountName = session.auth.actor
    this.chainId = session.link.chainId
    if (identity.signatures) {
      [this.signerProof] = identity.signatures
    }
    if (identity.signerKey) {
      this.signerKey = identity.signerKey
    }
    if (identity.serializedTransaction) {
      this.signerRequest = identity.serializedTransaction
    }
    this.requestPermission = session.auth.permission
    this.session = session
    this.rpc = rpc
  }

  public async signTransaction(transaction, options): Promise<SignTransactionResponse> {
    try {
      const completedTransaction = await this.session.transact(transaction, options)
      const wasBroadcast = (options.broadcast !== false)
      return this.returnEosjsTransaction(wasBroadcast, {
        transaction_id: completedTransaction.payload.tx,
        ...completedTransaction
      })
    } catch (e) {
      const message = e.message ? e.message : 'Unable to sign transaction'
      const type = UALErrorType.Signing
      const cause = e
      throw new UALAnchorError(message, type, cause)
    }
  }

  public async signArbitrary(publicKey: string, data: string, _: string): Promise<string> {
    throw new UALAnchorError(
      `Anchor does not currently support signArbitrary`,
      UALErrorType.Unsupported,
      null)
  }

  public async verifyKeyOwnership(challenge: string): Promise<boolean> {
    throw new UALAnchorError(
      `Anchor does not currently support verifyKeyOwnership`,
      UALErrorType.Unsupported,
      null)
  }

  public async getAccountName() {
    return this.accountName
  }

  public async getChainId() {
    return this.chainId
  }

  public async getKeys() {
    try {
      const keys = await this.signatureProvider.getAvailableKeys(this.requestPermission)
      return keys
    } catch (error) {
      const message = `Unable to getKeys for account ${this.accountName}.
        Please make sure your wallet is running.`
      const type = UALErrorType.DataRequest
      const cause = error
      throw new UALAnchorError(message, type, cause)
    }
  }

  public async isAccountValid() {
    try {
      const account = this.rpc && await this.rpc.get_account(this.accountName)
      const actualKeys = this.extractAccountKeys(account)
      const authorizationKeys = await this.getKeys()

      return actualKeys.filter((key) => {
        return authorizationKeys.indexOf(key) !== -1
      }).length > 0
    } catch (e) {
      if (e.constructor.name === 'UALAnchorError') {
        throw e
      }

      const message = `Account validation failed for account ${this.accountName}.`
      const type = UALErrorType.Validation
      const cause = e
      throw new UALAnchorError(message, type, cause)
    }
  }

  public extractAccountKeys(account) {
    const keySubsets = account.permissions.map((permission) => permission.required_auth.keys.map((key) => key.key))
    let keys = []
    for (const keySubset of keySubsets) {
      keys = keys.concat(keySubset)
    }
    return keys
  }
}
