import { IsString, MaxLength, ValidateIf } from "class-validator";

export class DeleteAccountDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(1024)
  password?: string;
}
