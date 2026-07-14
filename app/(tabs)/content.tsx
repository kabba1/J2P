import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { GeneratedAssetCard } from '@/components/generated-asset-card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ScreenContainer } from '@/components/ui/screen-container';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useGeneratedAssets } from '@/state/generated-assets-context';
import { useJobs } from '@/state/jobs-context';
import { GeneratedAsset } from '@/types/generated-asset';

export default function ContentScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { jobs } = useJobs();
  const {
    assets,
    loading,
    refresh,
    deleteAsset,
    fileExists,
  } = useGeneratedAssets();
  const [refreshing, setRefreshing] = useState(false);
  const [missingAssetIds, setMissingAssetIds] = useState<Set<string>>(new Set());
  const [assetToDelete, setAssetToDelete] = useState<GeneratedAsset>();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();
  const columns = width >= 720 ? 2 : 1;

  const jobNames = useMemo(
    () => new Map(jobs.map((job) => [job.id, job.name])),
    [jobs],
  );

  const verifyFiles = useCallback(async (records: GeneratedAsset[]) => {
    const checks = await Promise.all(
      records.map(async (asset) => ({
        id: asset.id,
        exists: await fileExists(asset.localUri).catch(() => false),
      })),
    );
    setMissingAssetIds(new Set(checks.filter((check) => !check.exists).map((check) => check.id)));
  }, [fileExists]);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setError(undefined);
    try {
      const records = await refresh();
      await verifyFiles(records);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Generated posts could not be loaded.',
      );
    } finally {
      if (showRefresh) setRefreshing(false);
    }
  }, [refresh, verifyFiles]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const confirmDelete = async () => {
    if (!assetToDelete || deleting) return;
    setDeleting(true);
    setError(undefined);
    try {
      await deleteAsset(assetToDelete.id);
      setMissingAssetIds((current) => {
        const next = new Set(current);
        next.delete(assetToDelete.id);
        return next;
      });
      setAssetToDelete(undefined);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'The generated post could not be deleted.',
      );
      setAssetToDelete(undefined);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScreenContainer>
      <FlatList
        key={`content-${columns}`}
        data={assets}
        numColumns={columns}
        keyExtractor={(asset) => asset.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={Colors.primary}
            onRefresh={() => void load(true)}
          />
        }
        columnWrapperStyle={columns === 2 ? styles.column : undefined}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="layers" size={26} color={Colors.primary} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Content</Text>
              <Text style={styles.subtitle}>
                Finished Before &amp; After posts saved on this device.
              </Text>
            </View>
            {assets.length > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{assets.length}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading && !refreshing ? (
            <ActivityIndicator color={Colors.primary} size="large" style={styles.loader} />
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="images-outline" size={38} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No generated posts yet</Text>
              <Text style={styles.emptyMessage}>
                Open a saved Before &amp; After pair and tap Create Post to make the first one.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          error ? (
            <View accessibilityRole="alert" style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={21} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <GeneratedAssetCard
              asset={item}
              jobName={jobNames.get(item.jobId) ?? 'Deleted job'}
              missing={missingAssetIds.has(item.id)}
              onPress={() =>
                router.push({ pathname: '/generated-asset', params: { assetId: item.id } })
              }
              onDelete={() => setAssetToDelete(item)}
              onImageError={() =>
                setMissingAssetIds((current) => new Set(current).add(item.id))
              }
            />
          </View>
        )}
      />

      <ConfirmDialog
        visible={Boolean(assetToDelete)}
        title="Delete this generated post?"
        message="This removes only the finished PNG. Your job photos and saved pair will stay unchanged."
        confirmLabel="Delete Post"
        destructive
        busy={deleting}
        onCancel={() => setAssetToDelete(undefined)}
        onConfirm={() => void confirmDelete()}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 980,
    flexGrow: 1,
    alignSelf: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  column: {
    gap: Spacing.lg,
  },
  cardWrapper: {
    flex: 1,
    minWidth: 0,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: Colors.primarySoft,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: Colors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  countBadge: {
    minWidth: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
  },
  countText: {
    color: Colors.primary,
    fontSize: 17,
    fontWeight: '800',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    backgroundColor: Colors.primarySoft,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  emptyMessage: {
    maxWidth: 330,
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  loader: {
    marginTop: 96,
  },
  errorBanner: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.dangerSoft,
  },
  errorText: {
    flex: 1,
    color: Colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
});
