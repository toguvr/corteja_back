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
import { PaymentsService } from './payments.service';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { IsPublic } from '@/core/decorators/is-public.decorator';
import { CurrentUser } from '@/core/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @IsPublic()
  create(@Body() createPaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @Post('barbershop/withdraw')
  createWithdraw(@CurrentUser() user, @Body() createPaymentDto) {
    return this.paymentsService.createWithdraw(
      user.sub,
      createPaymentDto.amount,
    );
  }

  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @Get('mine')
  findAllByCustomer(@CurrentUser() user) {
    return this.paymentsService.findAllByCustomer(user?.sub);
  }
  @Get('barbershop')
  findAllByBarbershop(@CurrentUser() user) {
    return this.paymentsService.findAllByBarbershop(user?.sub);
  }
  @Get('barbershop/withdrawals')
  findAllWithdrawsByBarbershop(
    @CurrentUser() user,
    @Query('page') page: string,
  ) {
    return this.paymentsService.findAllWithdrawalsByBarbershop(user?.sub, page);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }
}
