import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { MEMORY_UPLOAD_OPTIONS } from "@/common/uploads/memory-upload.options";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import type { CheckinDto } from "@/modules/pokedex/dtos/checkin.dto";
import type { CheckinPageDto } from "@/modules/pokedex/dtos/checkin-page.dto";
import { CheckinsQueryDto } from "@/modules/pokedex/dtos/checkins-query.dto";
import type { CreatedCheckinDto } from "@/modules/pokedex/dtos/created-checkin.dto";
import { PokedexService } from "@/modules/pokedex/pokedex.service";
import { CreateCheckinDto } from "@/modules/tastings/dtos/create-checkin.dto";

@Controller("checkins")
export class CheckinsController {
  constructor(private readonly pokedexService: PokedexService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("file", MEMORY_UPLOAD_OPTIONS))
  create(
    @CurrentUserId() userId: number,
    @Body() dto: CreateCheckinDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<CreatedCheckinDto> {
    return this.pokedexService.createCheckin(userId, dto, file);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getAll(@CurrentUserId() userId: number, @Query() query: CheckinsQueryDto): Promise<CheckinPageDto> {
    return this.pokedexService.getCheckins(userId, query);
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  getOne(@CurrentUserId() userId: number, @Param("id", ParseIntPipe) id: number): Promise<CheckinDto> {
    return this.pokedexService.getCheckin(userId, id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUserId() userId: number, @Param("id", ParseIntPipe) id: number): Promise<void> {
    return this.pokedexService.deleteCheckin(userId, id);
  }
}
