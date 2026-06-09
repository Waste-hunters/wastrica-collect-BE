import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';

@Injectable()
export class BillingSchedulerService {
  private readonly logger = new Logger(BillingSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  // Runs at 00:00 on the 1st of every month
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async createMonthlyBillingPeriods() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    this.logger.log(`[Scheduler] Starting monthly billing run for ${year}-${String(month).padStart(2, '0')}`);

    const companies = await this.prisma.company.findMany({
      where: { subscriptionStatus: { in: ['TRIAL', 'ACTIVE'] } },
      select: { id: true, name: true },
    });

    this.logger.log(`[Scheduler] Found ${companies.length} active/trial companies`);

    let periodsCreated = 0;
    let chargesGenerated = 0;
    let errors = 0;

    for (const company of companies) {
      try {
        // null requesterCompanyId bypasses tenant scope check
        const period = await this.billingService.createBillingPeriod(
          company.id,
          { year, month },
          null,
        );

        this.logger.log(`[Scheduler] Created billing period ${period.id} for company "${company.name}"`);
        periodsCreated++;

        const result = await this.billingService.generateCharges(period.id, null);
        chargesGenerated += result.chargesCreated;

        this.logger.log(
          `[Scheduler] Generated ${result.chargesCreated} charges for company "${company.name}" (total expected: ${result.totalExpectedRwf} RWF)`,
        );
      } catch (err) {
        errors++;
        this.logger.error(
          `[Scheduler] Failed for company "${company.name}" (${company.id}): ${err?.message}`,
        );
      }
    }

    this.logger.log(
      `[Scheduler] Monthly run complete — ${periodsCreated} periods created, ${chargesGenerated} charges generated, ${errors} errors`,
    );
  }
}
