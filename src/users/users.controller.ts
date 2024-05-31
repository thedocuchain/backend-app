import { Body, Controller, Param, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { ReadUserDto } from './dto/read-user.dto';
import { ApiResponse } from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch(':id')
  @ApiResponse({ status: 200, type: ReadUserDto })
  update(
    @Param('id')
    id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }
}
