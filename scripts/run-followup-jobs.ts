import { processFollowUpJobs } from '../src/lib/scheduler/jobRunner';
import { prisma } from '../src/lib/db/prisma';

async function main() {
  console.log(`Starting follow-up job processor at ${new Date().toISOString()}`);

  try {
    const result = await processFollowUpJobs();
    console.log(`Processed: ${result.processed}, Failed: ${result.failed}`);
  } catch (error) {
    console.error('Critical error in job runner:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
