import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from "@nestjs/common";
import { CurrentUserId } from "@/common/security/current-user-id.decorator";
import { BeersService } from "@/modules/beers/beers.service";
import type { CorrectionDto } from "@/modules/beers/dtos/correction.dto";
import { CreateCorrectionDto } from "@/modules/beers/dtos/create-correction.dto";

@Controller("beers/:beerId/corrections")
export class BeerCorrectionsController {
  constructor(private readonly beersService: BeersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getAll(@CurrentUserId() userId: number, @Param("beerId", ParseIntPipe) beerId: number): Promise<CorrectionDto[]> {
    return this.beersService.getBeerCorrections(userId, beerId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUserId() userId: number,
    @Param("beerId", ParseIntPipe) beerId: number,
    @Body() dto: CreateCorrectionDto,
  ): Promise<CorrectionDto> {
    return this.beersService.proposeCorrection(userId, beerId, dto);
  }
}
