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
import { BarbershopsService } from './barbershops.service';
import {
  createBarbershopBodySchema,
  CreateBarbershopDto,
} from './dto/create-barbershop.dto';
import { UpdateBarbershopDto } from './dto/update-barbershop.dto';
import { ZodValidationPipe } from '@/core/pipes/zod/zod-validation-pipe';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import { UserPayload } from '../auth/strategies/jwt.strategy';
import { IsPublic } from '@/core/decorators/is-public.decorator';

@Controller('barbershops')
export class BarbershopsController {
  constructor(private readonly barbershopsService: BarbershopsService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createBarbershopBodySchema))
  @IsPublic()
  create(@Body() createBarbershopDto: CreateBarbershopDto) {
    return this.barbershopsService.create(createBarbershopDto);
  }

  @Get()
  findAll() {
    return this.barbershopsService.findAll();
  }

  @Get('me')
  findOne(@CurrentUser() user: UserPayload) {
    return this.barbershopsService.findOne(user.sub);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: UserPayload) {
    return this.barbershopsService.getDashboard(user.sub);
  }

  @Get('slug/:slug')
  findOneBySlug(@Param('slug') slug: string) {
    return this.barbershopsService.findOneBySlug(slug);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBarbershopDto: UpdateBarbershopDto,
  ) {
    return this.barbershopsService.update(id, updateBarbershopDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.barbershopsService.remove(id);
  }
}
