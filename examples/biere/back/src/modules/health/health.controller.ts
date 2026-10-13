import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { Public } from "@/common/security/public.decorator";
import type { HealthDto } from "@/modules/health/dtos/health.dto";
import { HealthStatusEnum } from "@/modules/health/enums/health-status.enum";

@Public()
@Controller("health")
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  getHealth(): HealthDto {
    return { status: HealthStatusEnum.OK };
  }
}
