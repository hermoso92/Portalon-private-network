import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private config: ConfigService) {}

  /** Daily backup at 3:00 AM UTC */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runDailyBackup() {
    await this.runBackup();
  }

  async runBackup(): Promise<{ success: boolean; message: string }> {
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');

    if (nodeEnv !== 'production') {
      this.logger.log('Backup skipped — not in production environment');
      return { success: true, message: 'Skipped (non-production)' };
    }

    const scriptPath = path.resolve('/opt/portalon/infrastructure/scripts/backup_postgres.sh');

    this.logger.log('Starting scheduled database backup...');
    try {
      const { stdout, stderr } = await execAsync(`bash ${scriptPath}`, {
        env: {
          ...process.env,
          POSTGRES_DB: this.config.get<string>('POSTGRES_DB', 'portalon_db'),
          POSTGRES_USER: this.config.get<string>('POSTGRES_USER', 'portalon'),
        },
        timeout: 120_000,
      });

      if (stdout) this.logger.log(stdout.trim());
      if (stderr) this.logger.warn(stderr.trim());
      this.logger.log('Backup completed successfully');
      return { success: true, message: 'Backup completed' };
    } catch (err) {
      this.logger.error(`Backup failed: ${err.message}`);
      return { success: false, message: err.message };
    }
  }
}
