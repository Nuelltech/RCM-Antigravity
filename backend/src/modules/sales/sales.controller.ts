import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
    constructor(private readonly salesService: SalesService) { }

    @Get('dashboard')
    async getDashboardData(
        @Req() req,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.salesService.getDashboardData(req.user.tenantId, startDate, endDate);
    }

    @Post()
    async createSale(@Req() req, @Body() data: any) {
        return this.salesService.createSale(req.user.tenantId, req.user.userId, data);
    }

    @Get('item/:id')
    async getItemSales(
        @Req() req,
        @Param('id') id: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.salesService.getItemSales(req.user.tenantId, parseInt(id), startDate, endDate);
    }
}
