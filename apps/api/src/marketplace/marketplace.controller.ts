import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PartnersService } from '../partners/partners.service';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get()
  @ApiOperation({ summary: 'Itens do marketplace. filter=services|discounts|products; type=CLINIC|STORE|ONG; q=busca; limit/offset=paginação; sort=name|discount|partner.' })
  async getItems(
    @Query('filter') filter?: string,
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sort') sort?: string,
  ) {
    const f = (filter?.toLowerCase() ?? 'services') as 'services' | 'discounts' | 'products';
    const validFilter = f === 'services' || f === 'discounts' || f === 'products';
    const t = type?.toUpperCase() as 'CLINIC' | 'STORE' | 'ONG' | undefined;
    const validType = t === 'CLINIC' || t === 'STORE' || t === 'ONG' ? t : undefined;
    const limitNum = limit != null ? parseInt(limit, 10) : 50;
    const offsetNum = offset != null ? parseInt(offset, 10) : 0;
    const validSort = sort === 'name' || sort === 'discount' || sort === 'partner' ? sort : undefined;
    return this.partnersService.getMarketplaceItems(
      validFilter ? f : 'services',
      q,
      validType,
      Number.isFinite(limitNum) && limitNum > 0 ? limitNum : 50,
      Number.isFinite(offsetNum) && offsetNum >= 0 ? offsetNum : 0,
      validSort,
    );
  }
}
