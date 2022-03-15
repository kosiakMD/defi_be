import { AbiInput, AbiItem, AbiOutput } from 'web3-utils';
import { CallData } from '@app/common/dto/CallData';
import { plainToClass } from 'class-transformer';
import { CallInfo } from './chief/masterchief.loader';
import { dirname } from "path";
import * as fs from 'fs';
import { LoaderAbstract } from './loader.abstract';

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
    const [id, call] = getTemplatedCall(callInfo, t);
    blockchainCalls.set(id, call)
  })
  return blockchainCalls;
}

export function getTemplatedCall(callInfo: CallInfo, template): [string, CallData] {
  const extractedArgs = callInfo.args.map((ar) => {
    return template[ar];
  });
  return [
    callInfo.id + ':' + extractedArgs.join(':'),
    plainToClass(CallData, {
      address: callInfo.target,
      abi: callInfo.abi,
      input: {
        data: extractedArgs
      },
    })
  ]
}

export function getLoadersList(): any[] {
  const farmClientsDir = `${dirname(__filename)}`;

  const registry = []
  fs
    .readdirSync(farmClientsDir, { withFileTypes: true })
    .forEach((direct) => {
      if (!direct.isDirectory()) return;
      const farmClientsSubdir = `${farmClientsDir}/${direct.name}`;

      fs
        .readdirSync(farmClientsSubdir)
        .forEach((filename) => {
          if (['.ts', '.js'].indexOf(filename.slice(-3)) === -1) return;

          const imported = require(`${farmClientsSubdir}/${filename}`);
          Object.values(imported).forEach((obj) => {
            if (!((<any>obj).prototype instanceof LoaderAbstract)) {
              return;
            }

            registry.push(obj)
          });
        });
    });
  return registry;
}
