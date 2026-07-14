import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { JobCard } from '@/components/job-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenContainer } from '@/components/ui/screen-container';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useJobs } from '@/state/jobs-context';
import { useMedia } from '@/state/media-context';
import { MediaStage } from '@/types/media';
import { selectMostRecentActiveJob } from '@/utils/job-list';

const STAGES: { value: MediaStage; label: string; icon: 'camera-outline' | 'hammer-outline' | 'checkmark-circle-outline'; color: string }[] = [
  { value: 'before', label: 'Before', icon: 'camera-outline', color: Colors.before },
  { value: 'progress', label: 'Progress', icon: 'hammer-outline', color: Colors.progress },
  { value: 'after', label: 'After', icon: 'checkmark-circle-outline', color: Colors.after },
];

export default function CaptureScreen() {
  const router = useRouter();
  const { jobs, loading, error, refresh } = useJobs();
  const { countsForJob, refreshJob } = useMedia();
  const activeJob = useMemo(() => selectMostRecentActiveJob(jobs), [jobs]);

  useFocusEffect(
    useCallback(() => {
      void refresh().catch(() => undefined);
    }, [refresh]),
  );

  useFocusEffect(
    useCallback(() => {
      if (activeJob) {
        void refreshJob(activeJob.id).catch(() => undefined);
      }
    }, [activeJob, refreshJob]),
  );

  const openJob = () => {
    if (!activeJob) return;
    router.push({ pathname: '/(tabs)/(jobs)/[id]', params: { id: activeJob.id } });
  };

  const openStage = (stage: MediaStage) => {
    if (!activeJob) return;
    router.push({ pathname: '/gallery', params: { jobId: activeJob.id, stage } });
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <View style={styles.headingIcon}>
            <Ionicons name="camera" size={28} color={Colors.primary} />
          </View>
          <View style={styles.headingText}>
            <Text style={styles.title}>Capture</Text>
            <Text style={styles.subtitle}>Jump back into the latest active job.</Text>
          </View>
        </View>

        {loading && jobs.length === 0 ? (
          <ActivityIndicator color={Colors.primary} size="large" style={styles.loader} />
        ) : error && jobs.length === 0 ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={34} color={Colors.danger} />
            <Text style={styles.errorTitle}>Active job couldn’t load</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <PrimaryButton label="Try Again" onPress={() => void refresh()} />
          </View>
        ) : activeJob ? (
          <>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Latest Active Job</Text>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeLabel}>Active</Text>
              </View>
            </View>

            <JobCard
              job={activeJob}
              counts={countsForJob(activeJob.id)}
              onPress={openJob}
            />

            <View style={styles.quickCard}>
              <Text style={styles.quickTitle}>Quick capture</Text>
              <Text style={styles.quickMessage}>
                Choose the stage and start adding photos to {activeJob.name}.
              </Text>
              <View style={styles.stageRow}>
                {STAGES.map((stage) => (
                  <Pressable
                    key={stage.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${stage.label} photos for ${activeJob.name}`}
                    onPress={() => openStage(stage.value)}
                    style={({ pressed }) => [styles.stageButton, pressed && styles.pressed]}>
                    <View style={[styles.stageIcon, { backgroundColor: `${stage.color}14` }]}>
                      <Ionicons name={stage.icon} size={22} color={stage.color} />
                    </View>
                    <Text style={styles.stageLabel}>{stage.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <PrimaryButton
              label="Open Job Dashboard"
              icon="briefcase-outline"
              onPress={openJob}
            />
          </>
        ) : (
          <View style={styles.emptyWrap}>
            <EmptyState
              title="No active job"
              message="Create a job or restore one from Archived to make it available here."
            />
            <PrimaryButton label="Create New Job" icon="add" onPress={() => router.push('/new')} />
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  headingIcon: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: Colors.primarySoft,
  },
  headingText: {
    flex: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: '#EAF7ED',
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.after,
  },
  activeLabel: {
    color: Colors.after,
    fontSize: 12,
    fontWeight: '800',
  },
  quickCard: {
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  quickTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  quickMessage: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  stageRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  stageButton: {
    minHeight: 88,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  stageIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  stageLabel: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  loader: {
    marginTop: Spacing.xxl,
  },
  errorCard: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  errorTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  errorMessage: {
    color: Colors.textMuted,
    textAlign: 'center',
  },
  emptyWrap: {
    gap: Spacing.lg,
  },
  pressed: {
    opacity: 0.62,
  },
});
