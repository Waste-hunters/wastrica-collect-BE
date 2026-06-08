import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiMetaDto {
  @ApiPropertyOptional({ example: '2026-06-08T12:00:00.000Z' })
  timestamp?: string;
}

export class ApiErrorDto {
  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code: string;

  @ApiProperty({ example: 'The submitted payload is invalid.' })
  message: string;
}

export class ApiResponseDto<TData> {
  @ApiProperty()
  data: TData;

  @ApiPropertyOptional({ type: ApiMetaDto })
  meta?: ApiMetaDto;

  @ApiPropertyOptional({ type: ApiErrorDto, nullable: true })
  error?: ApiErrorDto | null;
}
