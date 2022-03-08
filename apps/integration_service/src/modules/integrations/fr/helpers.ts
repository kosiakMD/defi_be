import { AbiInput, AbiItem, AbiOutput } from 'web3-utils';
import { CallInfo } from './chief/masterchief.base';
import { CallData } from '@app/common/dto/CallData';
import { plainToClass } from 'class-transformer';

export function findMatchInAbi(callMinConfigs: Partial<AbiItem>[], abi: AbiItem[]): AbiItem | undefined {
  for (let i = 0; i < callMinConfigs.length; i++) {
    const match = findInAbi(callMinConfigs[i], abi);
    if (match) {
      return match;
    }
  }

  return undefined;
}

export function findInAbi(callMinConfig: Partial<AbiItem>, abi: AbiItem[]): AbiItem | undefined {
  const foundByName = abi.find((i) => i.name === callMinConfig.name);
  if (!foundByName) {
    return undefined;
  }

  if (!verifyInput(callMinConfig.inputs, foundByName.inputs)) {
    return undefined;
  }

  if (!verifyOutput(callMinConfig.outputs, foundByName.outputs)) {
    return undefined;
  }

  return foundByName;
}

function verifyInput(callInputs: AbiInput[], abiInputs: AbiInput[]): boolean {
  let isConfirmed = true;
  if (callInputs && callInputs) {
    for (let i = 0; i < callInputs.length; i++) {
      const nameConfirmed = callInputs[i].name === abiInputs[i].name;
      const typeConfirmed = callInputs[i].type === abiInputs[i].type;
      if (!nameConfirmed || !typeConfirmed) {
        return false;
      }
    }
  }
  return isConfirmed;
}

function verifyOutput(callOutputs: AbiOutput[], abiOutputs: AbiOutput[]): boolean {
  let isConfirmed = true;
  if (callOutputs && abiOutputs) {
    callOutputs.forEach((ca) => {
      const abiOutput = abiOutputs.find((ao) => {
        return ao.name === ca.name && ao.type === ao.type
      })
      if (!abiOutput) {
        return false;
      }
    })
  }
  return isConfirmed;
}


export function buildCallsMap(callInfos: CallInfo[]): Map<string, CallData> {
  const blockchainCalls = new Map<string, CallData>();
  callInfos.forEach((ci) => {
    blockchainCalls.set(ci.id, plainToClass(CallData, {
      address: ci.target,
      abi: ci.abi,
      input: {
        data: ci.args
      },
    }));
  })
  return blockchainCalls;
}

export function buildCallsMapFromTemplate(callInfo: CallInfo, templates: any[]) {
  const blockchainCalls = new Map<string, CallData>();
  templates.forEach((t) => {
    const extractedArgs = callInfo.args.map((ar) => {
      // if (!t[ar]): throw exception or continue processing?
      // can be dynamic if continue processing but more errors can be in future
      return t[ar];
    });
    blockchainCalls.set(callInfo.id + ':' + extractedArgs.join(':'), plainToClass(CallData, {
      address: callInfo.target,
      abi: callInfo.abi,
      input: {
        data: extractedArgs
      },
    }));
  })
  return blockchainCalls;
}
