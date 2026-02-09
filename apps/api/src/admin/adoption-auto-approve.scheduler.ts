import { Injectable, OnModuleInit } from '@nestjs/common';
import { AdminService } from './admin.service';

const INTERVAL_MS = 60 * 60 * 1000; // 1 hora

@Injectable()
export class AdoptionAutoApproveScheduler implements OnModuleInit {
  constructor(private readonly adminService: AdminService) {}

  onModuleInit() {
    this.run();
    setInterval(() => this.run(), INTERVAL_MS);
  }

  private async run(): Promise<void> {
    try {
      const { processed } = await this.adminService.runAutoApproveAdoptions();
      if (processed > 0) {
        console.log(`[AdoptionAutoApprove] ${processed} adoção(ões) auto-validadas.`);
      }
    } catch (e) {
      console.warn('[AdoptionAutoApprove] run failed', e);
    }
  }
}
