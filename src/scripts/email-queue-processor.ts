#!/usr/bin/env tsx

import { emailQueueProcessor } from '@/lib/email/processor';

async function main() {
  console.log('Starting Email Queue Processor...');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Shutting down gracefully...');
    emailQueueProcessor.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM. Shutting down gracefully...');
    emailQueueProcessor.stop();
    process.exit(0);
  });

  // Start the processor
  emailQueueProcessor.start();

  // Schedule cleanup job (run daily at 2 AM)
  const scheduleCleanup = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    
    const msUntilCleanup = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      console.log('Running daily cleanup job...');
      emailQueueProcessor.cleanupOldEmails(30);
      
      // Schedule next cleanup
      scheduleCleanup();
    }, msUntilCleanup);
  };

  scheduleCleanup();

  console.log('Email Queue Processor is running. Press Ctrl+C to stop.');
}

// Run the main function
main().catch((error) => {
  console.error('Failed to start Email Queue Processor:', error);
  process.exit(1);
});