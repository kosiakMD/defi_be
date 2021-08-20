/* eslint @typescript-eslint/no-var-requires: "off" */
import { MigrationEvent } from '../migration/types/events';
import { ApprovalsEntity } from '../store/entities/approvals.entity';
import { AssetTransfersEntity } from '../store/entities/assettransfers.entity';

export const ERC20_TRANSFER_EVENT_HASH =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const ERC20_APPROVAL_EVENT_HASH =
  '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';
export const ZERO_DATA = '0x';

export const TYPE_TRANSFER = 'transfer';
export const TYPE_APPROVAL = 'approval';

const Eth = require('web3-eth');
const eth = new Eth();

interface ReturnEntity {
  entity: AssetTransfersEntity | ApprovalsEntity | null;
  type: string;
}

export function toEntity(event: MigrationEvent): ReturnEntity {
  if (event.topic1 === ERC20_TRANSFER_EVENT_HASH) {
    return {
      entity: fromERC20Transfer(event),
      type: TYPE_TRANSFER,
    };
  }

  if (event.topic1 === ERC20_APPROVAL_EVENT_HASH) {
    return {
      entity: fromERC20Approval(event),
      type: TYPE_APPROVAL,
    };
  }

  throw Error(`template not found for [${event.topic1}]`);
}

function fromERC20Transfer(event: MigrationEvent): AssetTransfersEntity | null {
  const isEventCanBeConverted =
    event.topic1 === ERC20_TRANSFER_EVENT_HASH &&
    event.topic2 &&
    event.topic3 &&
    event.data !== ZERO_DATA;

  if (isEventCanBeConverted) {
    return {
      assetId: undefined,
      txHash: event.transactionHash,
      from: eth.abi.decodeParameter('address', event.topic2).toLowerCase(),
      to: eth.abi.decodeParameter('address', event.topic3).toLowerCase(),
      value: eth.abi.decodeParameter('uint256', event.data),
      blockNumber: event.blockNumber,
      timestamp: event.blockTimestamp,
      logIndex: event.logIndex,
    };
  }
  return null;
}

function fromERC20Approval(event: MigrationEvent): ApprovalsEntity | null {
  const isEventCanBeConverted =
    event.topic1 === ERC20_APPROVAL_EVENT_HASH &&
    event.topic2 &&
    event.topic3 &&
    event.data !== ZERO_DATA;

  if (isEventCanBeConverted) {
    return {
      assetId: undefined,
      userAddress: eth.abi.decodeParameter('address', event.topic2).toLowerCase(),
      tokenAddress: event.address.toLowerCase(),
      contractAddress: eth.abi.decodeParameter('address', event.topic3).toLowerCase(),
      amount: event.data,
      blockNumber: event.blockNumber,
      blockTimestamp: event.blockTimestamp,
      hash: event.transactionHash,
    };
  }
  return null;
}
