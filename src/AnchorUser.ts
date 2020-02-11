import { Chain, SignTransactionResponse, User, UALErrorType } from 'universal-authenticator-library'
import { Api, JsonRpc } from 'eosjs'

import { UALAnchorError } from './UALAnchorError'

export class AnchorUser extends User {
  private api: Api
  private rpc: JsonRpc
  private signatureProvider: any

  private chain: Chain
  private accountName: string = ''
  private requestPermission: string = ''

  constructor(chain, identity) {
    super()

    const { session } = identity
    this.chain = chain
    this.accountName = session.auth.actor
    this.requestPermission = session.auth.permission
    this.signatureProvider = session.makeSignatureProvider()

    const rpcEndpoint = this.chain.rpcEndpoints[0]
    const rpcEndpointString = this.buildRpcEndpoint(rpcEndpoint)
    this.rpc = new JsonRpc(rpcEndpointString)
    this.api = new Api({
      rpc: this.rpc,
      signatureProvider: this.signatureProvider,
    })
  }

  async init() {
    const rpcEndpoint = this.chain.rpcEndpoints[0]
    const rpcEndpointString = `${rpcEndpoint.protocol}://${rpcEndpoint.host}:${rpcEndpoint.port}`
    this.rpc = new JsonRpc(rpcEndpointString)
    this.api = new Api({
      rpc: this.rpc,
      signatureProvider: this.signatureProvider,
    })
  }

  async signTransaction(
    transaction,
    { broadcast = true, blocksBehind = 3, expireSeconds = 30 }
  ): Promise<SignTransactionResponse> {
    try {
      const completedTransaction = await this.api.transact(
        transaction,
        { broadcast, blocksBehind, expireSeconds }
      )
      return this.returnEosjsTransaction(broadcast, completedTransaction)
    } catch (e) {
      const message = e.message ? e.message : 'Unable to sign transaction'
      const type = UALErrorType.Signing
      const cause = e
      throw new UALAnchorError(message, type, cause)
    }
  }

  async signArbitrary(publicKey: string, data: string, _: string): Promise<string> {
    console.log("signArbitrary", publicKey, data)
    throw new UALAnchorError(
      `Anchor does not currently support signArbitrary`,
      UALErrorType.Unsupported,
      null)
  }

  async verifyKeyOwnership(challenge: string): Promise<boolean> {
    console.log("verifyKeyOwnership", challenge)
    throw new UALAnchorError(
      `Anchor does not currently support verifyKeyOwnership`,
      UALErrorType.Unsupported,
      null)
  }

  async getAccountName() {
    return this.accountName
  }

  async getChainId() {
    return this.chain.chainId
  }

  async getKeys() {
    console.log("getKeys")
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

  async isAccountValid() {
    console.log("isAccountValid")
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

  extractAccountKeys(account) {
    console.log("extractAccountKeys", account)
    const keySubsets = account.permissions.map((permission) => permission.required_auth.keys.map((key) => key.key))
    let keys = []
    for (const keySubset of keySubsets) {
      keys = keys.concat(keySubset)
    }
    return keys
  }
}
