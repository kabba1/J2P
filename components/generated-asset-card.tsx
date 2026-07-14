import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { GeneratedAsset } from '@/types/generated-asset';
import { formatDate } from '@/utils/format-date';

type GeneratedAssetCardProps = {
  asset: GeneratedAsset;
  jobName: string;
  missing?: boolean;
  onPress: () => void;
  onDelete: () => void;
  onImageError?: () => void;
};

function formatLabel(asset: GeneratedAsset): string {
  return asset.format === 'square' ? 'Square 1:1' : 'Portrait 4:5';
}

function layoutLabel(asset: GeneratedAsset): string {
  return asset.layout === 'side-by-side' ? 'Side by Side' : 'Stacked';
}

export function GeneratedAssetCard({
  asset,
  jobName,
  missing = false,
  onPress,
  onDelete,
  onImageError,
}: GeneratedAssetCardProps) {
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${jobName}. ${formatLabel(asset)} ${layoutLabel(asset)} post.${missing ? ' File unavailable.' : ''}`}
        accessibilityHint="Open the generated post"
        onPress={onPress}
        style={({ pressed }) => [styles.openArea, pressed && styles.pressed]}>
        {missing ? (
          <View style={[styles.thumbnail, styles.missingThumbnail]}>
            <Ionicons name="image-outline" size={38} color={Colors.textMuted} />
            <Text style={styles.missingText}>File unavailable</Text>
          </View>
        ) : (
          <Image
            accessibilityLabel={`Generated Before and After post for ${jobName}`}
            cachePolicy="memory-disk"
            contentFit="cover"
            onError={onImageError}
            source={{ uri: asset.localUri }}
            style={styles.thumbnail}
          />
        )}

        <View style={styles.details}>
          <View style={styles.titleText}>
            <Text numberOfLines={2} style={styles.jobName}>
              {jobName}
            </Text>
            <Text numberOfLines={1} style={styles.shotName}>
              {asset.sourceShotName || 'Before & After post'}
            </Text>
          </View>

          <View style={styles.metadataRow}>
            <View style={styles.badge}>
              <Ionicons name="resize-outline" size={15} color={Colors.primary} />
              <Text style={styles.badgeText}>{formatLabel(asset)}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="albums-outline" size={15} color={Colors.primary} />
              <Text style={styles.badgeText}>{layoutLabel(asset)}</Text>
            </View>
          </View>
          <Text style={styles.date}>Created {formatDate(asset.createdAt)}</Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete generated post for ${jobName}`}
        hitSlop={4}
        onPress={onDelete}
        style={({ pressed }) => [styles.deleteAction, pressed && styles.deletePressed]}>
        <Ionicons name="trash-outline" size={19} color={Colors.danger} />
        <Text style={styles.deleteLabel}>Delete Post</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2,
  },
  openArea: {
    backgroundColor: Colors.surface,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.995 }],
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 1.35,
    backgroundColor: Colors.surfaceMuted,
  },
  missingThumbnail: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  missingText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  details: {
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  titleText: {
    minWidth: 0,
  },
  jobName: {
    color: Colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  shotName: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  deleteAction: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  deletePressed: {
    backgroundColor: Colors.dangerSoft,
  },
  deleteLabel: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  badge: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
  },
  badgeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  date: {
    color: Colors.textMuted,
    fontSize: 12,
  },
});
