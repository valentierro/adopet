import { ApiProperty } from '@nestjs/swagger';
import { PetResponseDto } from '../../pets/dto/pet-response.dto';

export class FeedResponseDto {
  @ApiProperty({ type: [PetResponseDto] })
  items: PetResponseDto[];

  @ApiProperty({ nullable: true, description: 'Cursor para próxima página' })
  nextCursor: string | null;
}
