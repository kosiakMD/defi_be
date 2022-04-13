import { PartialType } from '@nestjs/swagger';

import { CreateAssetsCategoryDto } from './create-assets-category.dto';

export class UpdateAssetsCategoryDto extends PartialType(CreateAssetsCategoryDto) {}
