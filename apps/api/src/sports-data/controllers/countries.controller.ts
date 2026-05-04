import { Controller, Get, Query } from '@nestjs/common';
import { CountriesService } from '../services/countries.service';
import { CountryDto } from '../dto/country.dto';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  async getAll(@Query('search') search?: string): Promise<CountryDto[]> {
    if (search) return this.countriesService.search(search);
    return this.countriesService.getAll();
  }
}
