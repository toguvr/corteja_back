import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
class BankAccountDto {
  @IsString() bank_code: string;
  @IsString() agencia: string;
  @IsOptional() @IsString() agencia_dv?: string;
  @IsString() conta: string;
  @IsString() conta_dv: string;
  @IsString() document_number: string;
  @IsString() legal_name: string;
  @IsOptional() @IsString() type?: string;
}

export class CreateBarbershopDto {
  @IsString() name: string;
  @IsString() email: string;
  @IsString() password: string;
  @IsString() slug: string;
  @IsOptional() @IsString() avatar?: string;
  @IsInt() fee: number;
  @IsBoolean() haveLoyalty: boolean;
  @IsString() phone: string;
  @IsString() document: string;
  @IsString() legal_name: string;
  @IsOptional() @IsString() company_name?: string;
  @IsString() type: string;
  @IsString() transfer_interval: string;
  @IsInt() transfer_day: number;
  @ValidateNested() @Type(() => BankAccountDto) bank_account: BankAccountDto;
}
