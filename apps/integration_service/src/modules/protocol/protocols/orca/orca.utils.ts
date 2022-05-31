import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { objToString } from '@app/common/utils';

import { ORCA_FARM_ID } from './orca.constant';
import { userFarmData } from './orca.interface';
import { globalFarmStruct, uint256ToDecimal, userFarmStruct } from './orca.struct';

export async function findProgramAddress(account: string, wallet: string): Promise<PublicKey> {
  const [address] = await PublicKey.findProgramAddress(
    [
      new PublicKey(account).toBuffer(),
      new PublicKey(wallet).toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
    ],
    ORCA_FARM_ID,
  );
  return address;
}

export function filterResponsesUserFarms(responses: any[]) {
  const filteredResponses = new Map<string, userFarmData[]>();
  for (const response of responses) {
    if (response.result.value) {
      const [data, encoding] = response.result.value.data;
      const decoded = userFarmStruct.decode(Buffer.from(data, encoding));
      const decodedData: any = objToString(decoded);
      decodedData.cumulativeEmissionsCheckpoint = uint256ToDecimal(
        decoded.cumulativeEmissionsCheckpoint,
      );
      const check = filteredResponses.get(decodedData.owner);
      if (check) {
        check.push(decodedData);
      } else {
        filteredResponses.set(decodedData.owner, [decodedData]);
      }
    }
  }
  return filteredResponses;
}

export function filterResponsesGlobalFarm(responses: any[]) {
  const filteredResponses = new Map();
  for (const response of responses) {
    const [id] = response.id.split(':');
    const gettedData = filteredResponses.get(id);

    if (response.result.value?.data) {
      const [data, encoding] = response.result.value.data;
      const decoded = globalFarmStruct.decode(Buffer.from(data, encoding));
      const decodedData = objToString(decoded);
      decodedData['cumulativeEmissionsPerFarmToken'] = uint256ToDecimal(
        decoded.cumulativeEmissionsPerFarmToken,
      );
      if (!gettedData) {
        filteredResponses.set(id, decodedData);
      } else {
        filteredResponses.set(id, { ...gettedData, ...decodedData });
      }
    } else if (response.result.value?.amount) {
      const amountTokens = {
        totalDeposit: response.result.value?.amount,
      };
      if (!gettedData) {
        filteredResponses.set(id, amountTokens);
      } else {
        gettedData.totalDeposit = response.result.value?.amount;
      }
    }
  }

  return filteredResponses;
}
