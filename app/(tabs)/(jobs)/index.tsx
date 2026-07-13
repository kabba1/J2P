import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { JobCard } from '@/components/job-card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { Colors, Spacing } from '@/constants/theme';
import { useJobs } from '@/state/jobs-context';
import { useMedia } from '@/state/media-context';

export default function JobsScreen() {
  const router = useRouter();
  const { jobs, loading, error, refresh } = useJobs();
  const { countsForJob, refreshJobs } = useMedia();

  useFocusEffect(
    useCallback(() => {
      if (jobs.length > 0) {
        void refreshJobs(jobs.map((job) => job.id)).catch(() => undefined);
      }
    }, [jobs, refreshJobs]),
  );

  return (
    <ScreenContainer>
      <FlatList
        data={jobs}
        keyExtractor={(job) => job.id}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            counts={countsForJob(item.id)}
            onPress={() => router.push({ pathname: './[id]', params: { id: item.id } })}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={loading && jobs.length > 0} onRefresh={() => void refresh()} />
        }
        contentContainerStyle={[styles.content, jobs.length === 0 && styles.emptyContent]}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.wordmark}>
              Job<Text style={styles.wordmarkAccent}>ToPost</Text>
            </Text>
            <Text style={styles.tagline}>From finished job to ready-to-share story.</Text>
            <PrimaryButton
              label="New Job"
              icon="add"
              onPress={() => router.push('/new')}
              accessibilityHint="Open the new job form"
            />
            <Text style={styles.sectionTitle}>Recent Jobs</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.primary} size="large" style={styles.loader} />
          ) : error ? (
            <View style={styles.errorState}>
              <Text style={styles.errorTitle}>Jobs couldn’t load</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <PrimaryButton label="Try Again" onPress={() => void refresh()} />
            </View>
          ) : (
            <EmptyState
              title="Your first job starts here"
              message="Create a job now. Before, Progress, and After photos will stay organized together when capture is added."
            />
          )
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  emptyContent: {
    flexGrow: 1,
  },
  headerBlock: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  wordmark: {
    color: Colors.text,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  wordmarkAccent: {
    color: Colors.primary,
  },
  tagline: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    marginTop: Spacing.md,
  },
  separator: {
    height: Spacing.md,
  },
  loader: {
    marginTop: Spacing.xxl,
  },
  errorState: {
    gap: Spacing.md,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  errorTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  errorMessage: {
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
