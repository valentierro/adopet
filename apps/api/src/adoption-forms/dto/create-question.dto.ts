import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsIn,
  IsArray,
  IsNumber,
  IsObject,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const QUESTION_TYPES = [
  'TEXT',
  'TEXTAREA',
  'CHECKBOX',
  'SELECT_SINGLE',
  'SELECT_MULTIPLE',
  'NUMBER',
  'DATE',
  'FILE',
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export class QuestionOptionDto {
  @ApiProperty({ example: 'opt1' })
  @IsString()
  value: string;

  @ApiProperty({ example: 'Opção 1' })
  @IsString()
  label: string;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 0, description: 'Ordem de exibição' })
  @IsNumber()
  @Type(() => Number)
  sortOrder: number;

  @ApiProperty({ enum: QUESTION_TYPES })
  @IsString()
  @IsIn(QUESTION_TYPES)
  type: QuestionType;

  @ApiProperty({ example: 'Qual seu nome completo?' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  label: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({ example: 'Digite seu nome' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string;

  @ApiPropertyOptional({
    description: 'Para SELECT_SINGLE e SELECT_MULTIPLE: [{ value, label }]',
    example: [{ value: 'yes', label: 'Sim' }, { value: 'no', label: 'Não' }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @ApiPropertyOptional({ description: 'Usar esta pergunta no Match Score automático' })
  @IsOptional()
  @IsBoolean()
  useForScoring?: boolean;

  @ApiPropertyOptional({ description: 'Peso 0-10 para Match Score', minimum: 0, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  weight?: number;

  @ApiPropertyOptional({
    description: 'Config de pontuação: { "true":10, "false":0 } | { "optValue": points } | { ranges: [...] }',
  })
  @IsOptional()
  @IsObject()
  scoringConfig?: Record<string, unknown>;
}
