import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
} from '@nestjs/common';
import { AuthenticationsService } from './authentications.service';
import {
  CreateAuthenticationDto,
  authenticateBodySchema,
} from './dto/create-authentication.dto';
import { UpdateAuthenticationDto } from './dto/update-authentication.dto';
import { ZodValidationPipe } from '@/core/pipes/zod/zod-validation-pipe';
import { IsPublic } from '@/core/decorators/is-public.decorator';

@Controller('authentications')
export class AuthenticationsController {
  constructor(
    private readonly authenticationsService: AuthenticationsService,
  ) {}

  @Post()
  @IsPublic()
  @UsePipes(new ZodValidationPipe(authenticateBodySchema))
  create(@Body() createAuthenticationDto: CreateAuthenticationDto) {
    return this.authenticationsService.create(createAuthenticationDto);
  }

  @Get()
  findAll() {
    return this.authenticationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authenticationsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAuthenticationDto: UpdateAuthenticationDto,
  ) {
    return this.authenticationsService.update(+id, updateAuthenticationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authenticationsService.remove(+id);
  }
}
