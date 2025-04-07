import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { IsPublic } from '@/core/decorators/is-public.decorator';
import { CurrentUser } from '@/core/decorators/current-user.decorator';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @IsPublic()
  create(@Body() createCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }
  @Post('reset-password')
  @IsPublic()
  reset(@Body() resetPasswordDto) {
    return this.customersService.reset(resetPasswordDto);
  }
  @Post('forgot')
  @IsPublic()
  forgot(@Body() forgotDto) {
    return this.customersService.forgot(forgotDto);
  }

  @Get()
  findAll() {
    return this.customersService.findAll();
  }
  @Get('card')
  findAllUserCards(@CurrentUser() user) {
    return this.customersService.findAllUserCards(user.sub);
  }
  @Get('address')
  findMyAddress(@CurrentUser() user) {
    return this.customersService.findMyAddress(user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post('/card')
  createCard(@CurrentUser() user, @Body() body) {
    return this.customersService.createCard({ customerId: user.sub, ...body });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }
  @Put()
  updateMe(@CurrentUser() user, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(user?.sub, updateCustomerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
