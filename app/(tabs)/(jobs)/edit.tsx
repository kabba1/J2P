import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { JobForm } from '@/components/job-form';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Spacing } from '@/constants/theme';
import { useJobs } from '@/state/jobs-context';

export default function EditJobScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { jobs, loading, updateJob } = useJobs();
  const job = jobs.find((candidate) => candidate.id === id);

  if (!job && !loading) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Edit Job" onBack={() => router.back()} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundTitle}>Job not found</Text>
          <PrimaryButton label="Back to Jobs" onPress={() => router.replace('/')} />
        </View>
      </ScreenContainer>
    );
  }

  if (!job) {
    return (
      <ScreenContainer>
        <ScreenHeader title="Edit Job" onBack={() => router.back()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScreenHeader title="Edit Job" onBack={() => router.back()} />
      <JobForm
        initialJob={job}
        submitLabel="Save Changes"
        onSubmit={async (input) => {
          await updateJob(job.id, input);
          router.back();
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.lg,
    padding: Spacing.xl,
  },
  notFoundTitle: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
});
