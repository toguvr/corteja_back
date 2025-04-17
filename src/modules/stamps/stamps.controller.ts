import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { StampsService } from './stamps.service';
import { UpdateStampDto } from './dto/update-stamp.dto';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import { UserPayload } from '../auth/strategies/jwt.strategy';

@Controller('stamps')
export class StampsController {
  constructor(private readonly stampsService: StampsService) {}

  @Post()
  create(@Body() createStampDto, @CurrentUser() user: UserPayload) {
    return this.stampsService.create({
      ...createStampDto,
      customerId: user.sub,
    });
  }

  @Get()
  findAll() {
    return this.stampsService.findAll();
  }
  @Get('/barbershop/:barbershopId')
  count(
    @CurrentUser() user: UserPayload,
    @Param('barbershopId') barbershopId: string,
  ) {
    return this.stampsService.count(user.sub, barbershopId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stampsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStampDto: UpdateStampDto) {
    return this.stampsService.update(id, updateStampDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stampsService.remove(id);
  }
}
