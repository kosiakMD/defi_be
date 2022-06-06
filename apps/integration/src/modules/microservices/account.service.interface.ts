import { DetailedResponseDto } from '@app/common/dto';
import { ChainIdEnum } from '@app/common/enum';
import { Address } from '@app/common/types';

import { Asset } from '../../common/interfaces/transactions.interfaces';

export interface AccountServiceInterface {
  getAssets(addresses: Address[], chainIds?: ChainIdEnum[]): Promise<DetailedResponseDto<Asset[]>>;
}
