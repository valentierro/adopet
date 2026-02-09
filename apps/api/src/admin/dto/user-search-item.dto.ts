import { ApiProperty } from '@nestjs/swagger';

export class UserSearchItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;
}
