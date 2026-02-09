import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeedService } from './feed.service';
import { FeedQueryDto } from './dto/feed-query.dto';
import { FeedResponseDto } from './dto/feed-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('feed')
@ApiBearerAuth()
@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiOperation({ summary: 'Feed de pets disponíveis (cursor pagination)' })
  async getFeed(
    @CurrentUser() user: { id: string },
    @Query() query: FeedQueryDto,
  ): Promise<FeedResponseDto> {
    return this.feedService.getFeed({ ...query, userId: user.id });
  }

  @Get('map')
  @ApiOperation({ summary: 'Pins de pets no mapa (lat, lng, radiusKm)' })
  async getMap(
    @CurrentUser() user: { id: string },
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusKm') radiusKm?: string,
  ): Promise<{ items: { id: string; name: string; latitude: number; longitude: number; photoUrl: string }[] }> {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radius = radiusKm != null ? parseInt(radiusKm, 10) : 50;
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return { items: [] };
    }
    return this.feedService.getMapPins(latNum, lngNum, radius, user.id);
  }
}
