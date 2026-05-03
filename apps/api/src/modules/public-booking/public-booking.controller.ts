import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PublicBookingService } from './public-booking.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { CreatePublicReservationDto } from './dto/create-public-reservation.dto';

@ApiTags('public-booking')
@Controller('public')
export class PublicBookingController {
  constructor(private readonly publicBookingService: PublicBookingService) {}

  @Get(':slug/availability')
  @ApiOperation({ summary: 'Check available time slots for a date and party size' })
  async checkAvailability(
    @Param('slug') slug: string,
    @Query() dto: CheckAvailabilityDto,
  ) {
    return this.publicBookingService.checkAvailability(
      slug,
      dto.date,
      dto.partySize,
    );
  }

  @Post(':slug/reservations')
  @ApiOperation({ summary: 'Create a public reservation' })
  async createReservation(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicReservationDto,
  ) {
    return this.publicBookingService.createReservation(slug, dto);
  }
}
