import { AbiItem } from 'web3-utils';
import { CallGroup, ChiefGroupsMapping, ContractVars } from './chief/config';

export function collectCalls(requirements: ContractVars[], abi: AbiItem[]): Map<String, { call: CallGroup, abi: AbiItem }> | false {
  const varsMapping = new Map<String, { call: CallGroup, abi: AbiItem }>();
  for (const variableName of requirements) {
    const variableGroups = ChiefGroupsMapping[variableName];
    for (const groupName in variableGroups) {

      const isVariableConfirmed = confirmCallExists(variableGroups[groupName], abi);
      if (isVariableConfirmed) {
        varsMapping.set(variableName, isVariableConfirmed);
        // console.log(`Variable '${variableName}' is CONFIRMED`)
        // this.logger.debug(`Variable '${variableName}' is CONFIRMED for ${ChiefLoader.name}`)
      } else {
        // console.log(`Variable '${variableName}' is NOT CONFIRMED`)
        // this.logger.debug(`Variable '${variableName}' is NOT CONFIRMED for ${ChiefLoader.name}`)
      }
    }
  }
  // to confirm all variables found in abi need just to compare lengths
  if (varsMapping.size !== requirements.length) {
    return false;
  }

  return varsMapping;
}

export function confirmCallExists(callGroup: CallGroup, abi: AbiItem[]): { call: CallGroup, abi: AbiItem } | false {
  for (const abiCall of abi) {
    let nameConfirmed = false;
    let inputConfirmed = false;
    let outputConfirmed = false;

    const isHasInputArgs = callGroup.args?.length > 0;
    const isHasOutputArgs = callGroup.path !== 'output.data';
    const callOutputName = isHasOutputArgs
      ? callGroup.path.split('.')[2]
      : undefined;

    nameConfirmed = callGroup.call === abiCall.name;
    inputConfirmed = isHasInputArgs
      ? abiCall.inputs.length === callGroup.args?.length
      : abiCall.inputs.length === 0;
    outputConfirmed = isHasOutputArgs
      ? abiCall.outputs && Boolean(abiCall.outputs.find((o) => o.name === callOutputName))
      : !abiCall.outputs || abiCall.outputs.length === 1;

    // console.log('nameConfirmed')
    // console.log(nameConfirmed)
    // console.log('inputConfirmed')
    // console.log(inputConfirmed)
    // console.log('outputConfirmed')
    // console.log(outputConfirmed)

    if (nameConfirmed
      && inputConfirmed
      && outputConfirmed) {
      return {
        call: callGroup,
        abi: abiCall
      };
    }
  }
  return false;
}

export function deepFind(obj, path) {
  const paths = path.split('.');
  let current = obj;

  for (let i = 0; i < paths.length; ++i) {
    if (current[paths[i]] === undefined) {
      return undefined;
    }
    current = current[paths[i]];
  }
  return current;
}
