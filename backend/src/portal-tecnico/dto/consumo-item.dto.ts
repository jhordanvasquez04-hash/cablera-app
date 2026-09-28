import { IsNumber, IsString, Min, MinLength } from "class-validator";

export class ConsumoItemDto {
  @IsString()
  @MinLength(1)
  productoId!: string;

  @IsNumber()
  @Min(0.01)
  cantidad!: number;
}
