import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { UpdateChatDto } from './dto/update-chat.dto';
import { IsPublic } from '@/core/decorators/is-public.decorator';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post()
  @IsPublic()
  create(@Body() createChatDto) {
    return this.chatsService.create(createChatDto);
  }

  // @Get()
  // findAll() {
  //   return this.chatsService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.chatsService.findOne(id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateChatDto: UpdateChatDto) {
  //   return this.chatsService.update(id, updateChatDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.chatsService.remove(id);
  // }
}
