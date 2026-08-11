import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class SignInRequestDTO {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
