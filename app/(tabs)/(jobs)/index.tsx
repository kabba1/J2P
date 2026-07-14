import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { JobCard } from '@/components/job-card';
import { JobStatusFilter } from '@/components/job-status-filter';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { Colors, Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useJobs } from '@/state/jobs-context';
import { useMedia } from '@/state/media-context';
import { selectLatestJobMedia } from '@/utils/job-dashboard-presentation';
import {
  filterJobs,
  JobStatusFilter as JobStatusFilterValue,
} from '@/utils/job-list';

export default function JobsScreen() {
  const router = useRouter();
  const { jobs, loading, error, refresh } = useJobs();
  const { countsForJob, media, refreshJobs } = useMedia();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<JobStatusFilterValue>('active');

  useFocusEffect(
    useCallback(() => {
      if (jobs.length > 0) {
        void refreshJobs(jobs.map((job) => job.id)).catch(() => undefined);
      }
    }, [jobs, refreshJobs]),
  );

  const activeCount = useMemo(
    () => jobs.filter((job) => job.archivedAt === undefined).length,
    [jobs],
  );
  const archivedCount = jobs.length - activeCount;
  const visibleJobs = useMemo(
    () => filterJobs(jobs, { status, query }),
    [jobs, query, status],
  );

  const emptyState = useMemo(() => {
    if (jobs.length === 0) {
      return {
        title: 'Your first job starts here',
        message:
          'Create a job now. Before, Progress, and After photos will stay organized together.',
      };
    }
    if (query.trim()) {
      return {
        title: 'No matching jobs',
        message: 'Try a different name, customer, address, or service.',
      };
    }
    if (status === 'archived') {
      return {
        title: 'No archived jobs',
        message: 'Completed jobs you archive will stay safely available here.',
      };
    }
    if (status === 'active') {
      return {
        title: 'No active jobs',
        message: 'Restore an archived job or create a new one to keep capturing.',
      };
    }
    return {
      title: 'No jobs to show',
      message: 'Change the current filters or create a new job.',
    };
  }, [jobs.length, query, status]);

  const sectionLabel =
    status === 'active' ? 'Active Jobs' : status === 'archived' ? 'Archived Jobs' : 'All Jobs';

  return (
    <ScreenContainer>
      <FlatList
        data={visibleJobs}
        keyExtractor={(job) => job.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            counts={countsForJob(item.id)}
            previewUri={selectLatestJobMedia(media, item.id)?.localUri}
            onPress={() => router.push({ pathname: './[id]', params: { id: item.id } })}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={loading && jobs.length > 0} onRefresh={() => void refresh()} />
        }
        contentContainerStyle={[
          styles.content,
          visibleJobs.length === 0 && styles.emptyContent,
        ]}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.headingRow}>
              <View style={styles.headingText}>
                <Text style={styles.wordmark}>
                  Job<Text style={styles.wordmarkAccent}>ToPost</Text>
                </Text>
                <Text style={styles.tagline}>From finished job to ready-to-share story.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Settings"
                onPress={() => router.push('/settings')}
                style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}>
                <Ionicons name="settings-outline" size={20} color={Colors.text} />
                <Text style={styles.settingsLabel}>Settings</Text>
              </Pressable>
            </View>
            <PrimaryButton
              label="New Job"
              icon="add"
              onPress={() => router.push('/new')}
              accessibilityHint="Open the new job form"
            />

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={21} color={Colors.textMuted} />
              <TextInput
                accessibilityLabel="Search jobs"
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                onChangeText={setQuery}
                placeholder="Search jobs"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="search"
                style={styles.searchInput}
                value={query}
              />
              {query ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear job search"
                  hitSlop={8}
                  onPress={() => setQuery('')}
                  style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
                  <Ionicons name="close-circle" size={21} color={Colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <JobStatusFilter
              value={status}
              activeCount={activeCount}
              archivedCount={archivedCount}
              onChange={setStatus}
            />

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{sectionLabel}</Text>
              <Text style={styles.resultCount}>
                {visibleJobs.length} {visibleJobs.length === 1 ? 'job' : 'jobs'}
              </Text>
            </View>
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
            <View style={styles.emptyStateWrap}>
              <EmptyState title={emptyState.title} message={emptyState.message} />
              {jobs.length > 0 && (query.trim() || status !== 'active') ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear job filters"
                  onPress={() => {
                    setQuery('');
                    setStatus('active');
                  }}
                  style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}>
                  <Text style={styles.resetLabel}>Show Active Jobs</Text>
                </Pressable>
              ) : null}
            </View>
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
    paddingHorizontal: 20,
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
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headingText: {
    flex: 1,
    minWidth: 0,
  },
  wordmark: {
    color: Colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  wordmarkAccent: {
    color: Colors.primary,
  },
  tagline: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 2,
  },
  settingsButton: {
    minWidth: TouchTarget.minimum,
    minHeight: TouchTarget.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceRaised,
  },
  settingsLabel: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  searchContainer: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceRaised,
  },
  searchInput: {
    minHeight: 48,
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  resultCount: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
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
  emptyStateWrap: {
    gap: Spacing.md,
  },
  resetButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  resetLabel: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.62,
  },
});
