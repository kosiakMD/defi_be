/* eslint @typescript-eslint/no-var-requires: "off" */
import { EventDto } from '../store/types/event.dto';
import { AssetTransfersEntity } from '../store/entities/assettransfers.entity';
import { MigrationEvent } from '../migration/types/events';

const Eth = require('web3-eth');

export const ERC20_TRANSFERS_TEMPLATE = 'erc20'
export const ERC20_TRANSFER_EVENT_HASH = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
export const WETH_TRANSFERS_TEMPLATE = 'weth'
export const WETH_DEPOSIT_EVENT_HASH = '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c'
export const WETH_WITHDRAWAL_EVENT_HASH = '0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65'

export function toTransfer(event: MigrationEvent):  AssetTransfersEntity | null {
  if (event.template === ERC20_TRANSFERS_TEMPLATE) {
    return fromERC20Transfer(event)
  }
  if (event.template === WETH_TRANSFERS_TEMPLATE) {
    return fromWethEvent(event)
  }

  throw Error(`template not found for [${event.template}], asset id [${event.assetId}]`)
}

function fromERC20Transfer(event: MigrationEvent): AssetTransfersEntity | null {
  if (event.topic1 === ERC20_TRANSFER_EVENT_HASH) {
    // todo: need to move somewhere
    const eth = new Eth()
    return {
      assetId: event.assetId,
      txHash: event.transactionHash,
      from: eth.abi.decodeParameter('address', event.topic2)
        .toLowerCase(),
      to: eth.abi.decodeParameter('address', event.topic3)
        .toLowerCase(),
      value: eth.abi.decodeParameter('uint256', event.data),
      timestamp: event.blockTimestamp
    }
  }
  return null
}

function fromWethEvent(event: MigrationEvent): AssetTransfersEntity | null {
  const eth = new Eth()
  if (event.topic1 === ERC20_TRANSFER_EVENT_HASH) {
    return {
      assetId: event.assetId,
      txHash: event.transactionHash,
      from: eth.abi.decodeParameter('address', event.topic2)
        .toLowerCase(),
      to: eth.abi.decodeParameter('address', event.topic3)
        .toLowerCase(),
      value: eth.abi.decodeParameter('uint256', event.data),
      timestamp: event.blockTimestamp
    }
  }
  if (event.topic1 === WETH_DEPOSIT_EVENT_HASH) {
    return {
      assetId: event.assetId,
      txHash: event.transactionHash,
      from: null,
      to: eth.abi.decodeParameter('address', event.topic2)
        .toLowerCase(),
      value: eth.abi.decodeParameter('uint256', event.data),
      timestamp: event.blockTimestamp
    }
  }
  if (event.topic1 === WETH_WITHDRAWAL_EVENT_HASH) {
    return {
      assetId: event.assetId,
      txHash: event.transactionHash,
      from: eth.abi.decodeParameter('address', event.topic2)
        .toLowerCase(),
      to: null,
      value: eth.abi.decodeParameter('uint256', event.data),
      timestamp: event.blockTimestamp
    }
  }
  return null
}

export function toTransfers(assetId: number, template: string, dbEvents: EventDto[]):  AssetTransfersEntity[] {

  if (template === ERC20_TRANSFERS_TEMPLATE) {
    return fromERC20Transfers(assetId, dbEvents)
  }

  if (template === WETH_TRANSFERS_TEMPLATE) {
    return fromWETHEvents(assetId, dbEvents)
  }

  throw Error(`not found transfers template for [${template}], asset id [${assetId}]`)
}

function fromERC20Transfers(assetId: number, dbEvents: EventDto[]): AssetTransfersEntity[] {
  const eth = new Eth()
  let parsedEvents: AssetTransfersEntity[] = []
  dbEvents.map(e => {
    if (e.topic1 === ERC20_TRANSFER_EVENT_HASH) {
      parsedEvents.push({
        assetId: assetId,
        from: eth.abi.decodeParameter('address', e.topic2)
          .toLowerCase(),
        to: eth.abi.decodeParameter('address', e.topic3)
          .toLowerCase(),
        value: eth.abi.decodeParameter('uint256', e.data),
        timestamp: e.blockTimestamp,
        txHash: e.txHash
      })
    }
  })
  return parsedEvents
}

function fromWETHEvents(assetId: number, dbEvents: EventDto[]) {
  const eth = new Eth()
  let parsedEvents: AssetTransfersEntity[] = []
  dbEvents.map(e => {
    if (e.topic1 === ERC20_TRANSFER_EVENT_HASH) {
      parsedEvents.push({
        assetId: assetId,
        from: eth.abi.decodeParameter('address', e.topic2)
          .toLowerCase(),
        to: eth.abi.decodeParameter('address', e.topic3)
          .toLowerCase(),
        value: eth.abi.decodeParameter('uint256', e.data),
        timestamp: e.blockTimestamp,
        txHash: e.txHash
      })
    }
    if (e.topic1 === WETH_DEPOSIT_EVENT_HASH) {
      parsedEvents.push({
        assetId: assetId,
        txHash: e.txHash,
        from: null,
        to: eth.abi.decodeParameter('address', e.topic2)
          .toLowerCase(),
        value: eth.abi.decodeParameter('uint256', e.data),
        timestamp: e.blockTimestamp
      })
    }
    if (e.topic1 === WETH_WITHDRAWAL_EVENT_HASH) {
      parsedEvents.push({
        assetId: assetId,
        txHash: e.txHash,
        from: eth.abi.decodeParameter('address', e.topic2)
          .toLowerCase(),
        to: null,
        value: eth.abi.decodeParameter('uint256', e.data),
        timestamp: e.blockTimestamp
      })
    }
  })
  return parsedEvents
}
