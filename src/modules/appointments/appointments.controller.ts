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
import { AppointmentsService } from './appointments.service';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CurrentUser } from '@/core/decorators/current-user.decorator';
import { IsPublic } from '@/core/decorators/is-public.decorator';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@CurrentUser() user, @Body() createAppointmentDto) {
    return this.appointmentsService.create({
      ...createAppointmentDto,
      customerId: user.sub,
    });
  }

  @Post('subscriptions-job')
  @IsPublic()
  runWeeklySubscriptionJob() {
    return this.appointmentsService.runWeeklySubscriptionJob();
  }

  @Get()
  findAll() {
    return this.appointmentsService.findAll();
  }
  @Get('next')
  findAllNextFromUser(@CurrentUser() user) {
    return this.appointmentsService.findAllNextFromUser(user.sub);
  }
  @Get('past')
  findAllPastFromUser(
    @CurrentUser() user,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    const data = this.appointmentsService.findAllPastFromUser(
      user.sub,
      Number(page),
      Number(limit),
    );

    return data;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(id, updateAppointmentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appointmentsService.remove(id);
  }
}
