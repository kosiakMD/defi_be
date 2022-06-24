/* eslint-disable no-underscore-dangle */
import Web3 from 'web3';
import { JsonRpcPayload, JsonRpcResponse } from 'web3-core-helpers';

import { HEADER_REQUEST_ID } from '@app/common/constant';
import { ctx } from '@app/common/helpers/context';

const overrideRequest = true;
const overrideSend = true;
if (overrideRequest) {
  Web3.providers.HttpProvider.prototype._prepareRequestOld =
    Web3.providers.HttpProvider.prototype._prepareRequest;
  Web3.providers.HttpProvider.prototype.send = function () {
    const request = this._prepareRequestOld();
    const context = ctx();
    const reqId = context?.reqId;
    request.setRequestHeader(HEADER_REQUEST_ID, reqId);
    return request;
  };
}

if (overrideSend) {
  Web3.providers.HttpProvider.prototype.sendOld = Web3.providers.HttpProvider.prototype.send;
  Web3.providers.HttpProvider.prototype.send = function (
    payload: JsonRpcPayload,
    callback: (error: Error | null, result?: JsonRpcResponse) => void,
  ) {
    const callOverride = function (error, result) {
      callback(error, result);
    };
    this.sendOld(payload, callOverride);
  };
}

// TODO: for the future when Web3 will be compeited in TS according to roadmap
/*
 class CustomHttpProvider extends HttpProvider {
 constructor(host: string, options?: HttpProviderOptions) {
 super(host, options);
 }

 send(
 payload: JsonRpcPayload,
 callback: (error: Error | null, result?: JsonRpcResponse) => void,
 ): void {

 super.send(payload, callback);
 }
 }
 */

export default Web3;
