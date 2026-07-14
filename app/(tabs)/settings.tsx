import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ui/screen-container';
import { Colors, Radius, Spacing } from '@/constants/theme';

type InfoRowProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  message: string;
  tone?: 'default' | 'warning';
};

function InfoRow({ icon, title, message, tone = 'default' }: InfoRowProps) {
  const warning = tone === 'warning';
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={icon}
        size={22}
        color={warning ? Colors.progress : Colors.primary}
      />
      <View style={styles.infoText}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoMessage}>{message}</Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Ionicons name="settings" size={25} color={Colors.primary} />
          <View style={styles.headingText}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Storage, privacy, and app behavior.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage & Data</Text>
          <View style={styles.card}>
            <InfoRow
              icon="phone-portrait-outline"
              title="Original photos stay on this device"
              message="Accepted job photos are copied into JobToPost’s private app storage. Other apps cannot browse that folder directly."
            />
            <View style={styles.divider} />
            <InfoRow
              icon="cloud-offline-outline"
              title="No automatic cloud backup"
              message="JobToPost does not upload original photos or generated posts to a server."
            />
            <View style={styles.divider} />
            <InfoRow
              icon="warning-outline"
              title="Local-only files can be lost"
              message="Uninstalling JobToPost, clearing its app storage, or losing this phone may permanently remove job originals that were not exported elsewhere."
              tone="warning"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Each Action Does</Text>
          <View style={styles.card}>
            <InfoRow
              icon="archive-outline"
              title="Archiving keeps everything"
              message="Archiving only moves a job out of the Active list. Its photos, saved pairs, and generated posts stay in JobToPost."
            />
            <View style={styles.divider} />
            <InfoRow
              icon="download-outline"
              title="Saving a post does not save originals"
              message="Save to Photos copies a finished generated post. It does not copy that job’s original Before, Progress, or After photos."
            />
            <View style={styles.divider} />
            <InfoRow
              icon="trash-outline"
              title="Deleting a job removes its managed files"
              message="Deleting a job removes its original photos, saved pairs, and generated posts from JobToPost on this device."
            />
          </View>
        </View>

        <View style={styles.pendingCard}>
          <Ionicons name="shield-checkmark-outline" size={26} color={Colors.primary} />
          <View style={styles.pendingText}>
            <Text style={styles.pendingTitle}>Backup tools are still coming</Text>
            <Text style={styles.pendingMessage}>
              Export All Originals, complete job archives, and automatic original-photo copies are not available yet. Until then, treat JobToPost originals as local-only.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <View style={styles.card}>
            <InfoRow
              icon="camera-outline"
              title="Camera"
              message="Requested only when you begin capturing a job photo."
            />
            <View style={styles.divider} />
            <InfoRow
              icon="images-outline"
              title="Photos"
              message="Requested only when you explicitly save a finished generated post to your device photo library."
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: Spacing.xl,
    paddingHorizontal: 20,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  headingText: {
    flex: 1,
  },
  title: {
    color: Colors.text,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceRaised,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  infoText: {
    flex: 1,
    gap: 3,
  },
  infoTitle: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  infoMessage: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 34,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceRaised,
  },
  pendingText: {
    flex: 1,
    gap: 3,
  },
  pendingTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  pendingMessage: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
