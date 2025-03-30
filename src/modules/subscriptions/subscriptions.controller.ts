import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CurrentUser } from '@/core/decorators/current-user.decorator';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  create(@CurrentUser() user, @Body() createSubscriptionDto) {
    return this.subscriptionsService.create({
      ...createSubscriptionDto,
      customerId: user?.sub,
    });
  }

  @Get()
  findAll() {
    return this.subscriptionsService.findAll();
  }

  @Get('mine')
  findAllMine(@CurrentUser() user) {
    return this.subscriptionsService.findAllMine(user?.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.update(id, updateSubscriptionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subscriptionsService.remove(id);
  }
}
