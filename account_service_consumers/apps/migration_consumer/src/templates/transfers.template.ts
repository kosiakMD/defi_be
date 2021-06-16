/* eslint @typescript-eslint/no-var-requires: "off" */
import { AssetTransfersEntity } from '../store/entities/assettransfers.entity';
import { MigrationEvent } from '../migration/types/events';

const Eth = require('web3-eth');

export const ERC20_TRANSFER_EVENT_HASH = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
export const ZERO_DATA = '0x'

export function toTransfer(event: MigrationEvent):  AssetTransfersEntity | null {
  if (event.topic1 === ERC20_TRANSFER_EVENT_HASH) {
    return fromERC20Transfer(event)
  }

  throw Error(`template not found for [${event.topic1}]`)
}

function fromERC20Transfer(event: MigrationEvent): AssetTransfersEntity | null {

  const isEventCanBeConverted =
    event.topic1 === ERC20_TRANSFER_EVENT_HASH
    && event.topic2
    && event.topic3
    && event.data !== ZERO_DATA

  if (isEventCanBeConverted) {
    // todo: need to move somewhere
    const eth = new Eth()
    return {
      assetId: undefined,
      txHash: event.transactionHash,
      from: eth.abi.decodeParameter('address', event.topic2)
        .toLowerCase(),
      to: eth.abi.decodeParameter('address', event.topic3)
        .toLowerCase(),
      value: eth.abi.decodeParameter('uint256', event.data),
      blockNumber: event.blockNumber,
      timestamp: event.blockTimestamp,
      logIndex: event.logIndex
    }
  }
  return null
}
