import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { BalancesService } from './balances.service';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { CurrentUser } from '@/core/decorators/current-user.decorator';

@Controller('balances')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Post()
  create(@Body() createBalanceDto) {
    return this.balancesService.create(createBalanceDto);
  }

  @Get()
  findAll() {
    return this.balancesService.findAll();
  }

  @Get('mine')
  findMine(@CurrentUser() user, @Query('barbershopId') barbershopId: string) {
    return this.balancesService.findMine({
      customerId: user.sub,
      barbershopId,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.balancesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBalanceDto: UpdateBalanceDto) {
    return this.balancesService.update(id, updateBalanceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.balancesService.remove(id);
  }
}
