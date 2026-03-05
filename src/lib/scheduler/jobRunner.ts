import { jobQueue } from './jobQueue';
import { executeFollowUpJob } from './followUpJobs';

export async function processFollowUpJobs() {
  const jobs = await jobQueue.getPendingJobs(10);

  const result = {
    processed: 0,
    failed: 0,
  };

  for (const job of jobs) {
    try {
      await jobQueue.updateJobStatus(job.id, 'RUNNING');
      await executeFollowUpJob(job);
      result.processed++;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Job ${job.id} failed:`, message);
      const shouldRetry = job.retryCount < 3;
      await jobQueue.updateJobStatus(job.id, shouldRetry ? 'SCHEDULED' : 'FAILED', message);
      if (shouldRetry) {
        await jobQueue.incrementRetryCount(job.id);
      }
      result.failed++;
    }
  }

  return result;
}
