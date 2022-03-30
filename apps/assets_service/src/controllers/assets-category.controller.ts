import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';

import { AssetsCategoryService } from '../modules/assets-category/assets-category.service';
import { CreateAssetsCategoryDto } from '../modules/assets-category/dto/create-assets-category.dto';
import { UpdateAssetsCategoryDto } from '../modules/assets-category/dto/update-assets-category.dto';

@Controller('assets-category')
export class AssetsCategoryController {
  constructor(private readonly assetsCategoryService: AssetsCategoryService) {}

  @Post()
  create(@Body() createAssetsCategoryDto: CreateAssetsCategoryDto) {
    return this.assetsCategoryService.create(createAssetsCategoryDto);
  }

  @Get()
  findAll() {
    return this.assetsCategoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsCategoryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAssetsCategoryDto: UpdateAssetsCategoryDto) {
    return this.assetsCategoryService.update(+id, updateAssetsCategoryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assetsCategoryService.remove(+id);
  }
}
