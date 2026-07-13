import { useRouter } from 'expo-router';

import { JobForm } from '@/components/job-form';
import { ScreenContainer } from '@/components/ui/screen-container';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useJobs } from '@/state/jobs-context';

export default function NewJobScreen() {
  const router = useRouter();
  const { createJob } = useJobs();

  return (
    <ScreenContainer>
      <ScreenHeader title="New Job" onBack={() => router.back()} />
      <JobForm
        submitLabel="Create Job"
        onSubmit={async (input) => {
          const job = await createJob(input);
          router.replace({ pathname: './[id]', params: { id: job.id } });
        }}
      />
    </ScreenContainer>
  );
}
