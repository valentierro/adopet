import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeedService } from './feed.service';
import { FeedQueryDto } from './dto/feed-query.dto';
import { FeedResponseDto } from './dto/feed-response.dto';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Feed de pets disponíveis. Sem auth: listagem pública (grid visitante).' })
  async getFeed(
    @CurrentUser() user: { id: string } | undefined,
    @Query() query: FeedQueryDto,
  ): Promise<FeedResponseDto> {
    return this.feedService.getFeed({ ...query, userId: user?.id });
  }

  @Get('map')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pins de pets no mapa (lat, lng, radiusKm, species)' })
  async getMap(
    @CurrentUser() user: { id: string } | undefined,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('species') species?: string,
  ): Promise<{ items: { id: string; name: string; age: number; species: string; city?: string; latitude: number; longitude: number; photoUrl: string }[] }> {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radius = radiusKm != null ? parseInt(radiusKm, 10) : 50;
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return { items: [] };
    }
    const speciesFilter = species === 'DOG' || species === 'CAT' ? species : undefined;
    return this.feedService.getMapPins(latNum, lngNum, radius, user?.id, speciesFilter);
  }
}
