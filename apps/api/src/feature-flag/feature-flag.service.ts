import { Injectable } from '@nestjs/common';

export type FeatureFlagContext = Record<string, unknown>;

@Injectable()
export class FeatureFlagService {
  invalidateKey(_key: string): void {
    // Cache invalidation placeholder; implement if needed
  }

  async isEnabled(_key: string, _context?: FeatureFlagContext): Promise<boolean> {
    return false;
  }
}
