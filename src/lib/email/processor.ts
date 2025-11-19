import { emailService } from '@/lib/email';

type Timeout = ReturnType<typeof setTimeout>;

interface QueueProcessorOptions {
  intervalMs?: number;
  batchSize?: number;
  maxRetries?: number;
  enableLogging?: boolean;
}

export class EmailQueueProcessor {
  private isRunning = false;
  private intervalId: Timeout | null = null;
  private options: Required<QueueProcessorOptions>;

  constructor(options: QueueProcessorOptions = {}) {
    this.options = {
      intervalMs: options.intervalMs || 60000, // 1 minute default
      batchSize: options.batchSize || 10,
      maxRetries: options.maxRetries || 3,
      enableLogging: options.enableLogging !== false,
    };
  }

  /**
   * Start the queue processor
   */
  start(): void {
    if (this.isRunning) {
      this.log('Queue processor is already running');
      return;
    }

    this.isRunning = true;
    this.log('Starting email queue processor');

    // Process immediately on start
    this.processQueue();

    // Set up interval processing
    this.intervalId = setInterval(() => {
      this.processQueue();
    }, this.options.intervalMs);
  }

  /**
   * Stop the queue processor
   */
  stop(): void {
    if (!this.isRunning) {
      this.log('Queue processor is not running');
      return;
    }

    this.isRunning = false;
    this.log('Stopping email queue processor');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Process the email queue
   */
  private async processQueue(): Promise<void> {
    try {
      this.log('Processing email queue...');

      const result = await emailService.processQueue();

      this.log(
        `Queue processing completed: ${result.processed} processed, ${result.failed} failed`
      );

      // Get queue stats for monitoring
      const stats = await emailService.getQueueStats();
      this.log(
        `Queue stats: ${stats.pending_count} pending, ${stats.retry_count} retry, ${stats.sent_today} sent today`
      );
    } catch (error) {
      this.log(`Error processing queue: ${error}`);
    }
  }

  /**
   * Cleanup old emails
   */
  async cleanupOldEmails(olderThanDays: number = 30): Promise<void> {
    try {
      const queueService = emailService.getQueueService();
      const deletedCount = await queueService.cleanupOldEmails(olderThanDays);
      this.log(`Cleaned up ${deletedCount} old emails`);
    } catch (error) {
      this.log(`Error cleaning up old emails: ${error}`);
    }
  }

  /**
   * Get processor status
   */
  getStatus(): { isRunning: boolean; options: QueueProcessorOptions } {
    return {
      isRunning: this.isRunning,
      options: this.options,
    };
  }

  /**
   * Log messages if logging is enabled
   */
  private log(message: string): void {
    if (this.options.enableLogging) {
      console.log(
        `[EmailQueueProcessor] ${new Date().toISOString()} - ${message}`
      );
    }
  }
}

// Export singleton instance
export const emailQueueProcessor = new EmailQueueProcessor({
  intervalMs: parseInt(process.env.EMAIL_QUEUE_INTERVAL_MS || '60000'),
  batchSize: parseInt(process.env.EMAIL_QUEUE_BATCH_SIZE || '10'),
  enableLogging: process.env.NODE_ENV !== 'test',
});
