import { Region } from '../domain/Region';
import { DateRange } from '../domain/DateRange';
import { Cost } from '../domain/Cost';

export interface CostProvider {
  fetchCost(params: {
    region: Region;
    dateRange: DateRange;
  }): Promise<Cost>;
}
