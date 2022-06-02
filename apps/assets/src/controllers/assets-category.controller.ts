import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AssetsCategoryService } from '../modules/assets-category/assets-category.service';

@ApiTags('Assets Categories')
@Controller('assets-category')
export class AssetsCategoryController {
  constructor(private readonly assetsCategoryService: AssetsCategoryService) {}

  @Get()
  findAll() {
    return this.assetsCategoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsCategoryService.findOne(+id);
  }
}
