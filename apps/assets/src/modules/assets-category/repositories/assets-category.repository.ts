import { EntityRepository, In, Repository } from 'typeorm';

import { AssetCategoryEntity } from '../entities/asset-category.entity';

@EntityRepository(AssetCategoryEntity)
export class AssetsCategoryRepository extends Repository<AssetCategoryEntity> {
  findOneByCode(code: string): Promise<AssetCategoryEntity> {
    return this.findOne({
      where: { code },
    });
  }

  async findOrCreate(codes: string[]): Promise<AssetCategoryEntity[]> {
    if (!codes.length) {
      return [];
    }

    const categories = await this.find({
      where: { code: In(codes) },
    });

    const unknownCodes = codes.filter((code) =>
      categories.every((category) => category.code !== code),
    );
    if (!unknownCodes.length) {
      return categories;
    }

    const newCategories = await this.save(
      unknownCodes.map((code) => {
        const category = new AssetCategoryEntity();
        category.code = code;
        category.name = code;
        return category;
      }),
    );

    return categories.concat(newCategories);
  }
}
