import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

type PhotoMetadataFormProps = {
  shotName: string;
  note: string;
  embedded?: boolean;
  onChangeShotName: (value: string) => void;
  onChangeNote: (value: string) => void;
};

export function PhotoMetadataForm({
  shotName,
  note,
  embedded = false,
  onChangeShotName,
  onChangeNote,
}: PhotoMetadataFormProps) {
  return (
    <View style={[styles.card, embedded && styles.embedded]}>
      <View style={styles.fieldRow}>
        <Ionicons name="pricetag-outline" size={23} color={Colors.primary} />
        <View style={styles.fieldContent}>
          <Text style={styles.label}>Shot name</Text>
          <TextInput
            accessibilityLabel="Shot name"
            autoCapitalize="words"
            maxLength={80}
            onChangeText={onChangeShotName}
            placeholder="Living Room Wide (optional)"
            placeholderTextColor={Colors.textTertiary}
            returnKeyType="next"
            style={styles.input}
            value={shotName}
          />
        </View>
      </View>
      <View style={[styles.fieldRow, styles.noteRow]}>
        <Ionicons name="document-text-outline" size={23} color={Colors.primary} />
        <View style={styles.fieldContent}>
          <Text style={styles.label}>Note</Text>
          <TextInput
            accessibilityLabel="Photo note"
            maxLength={300}
            multiline
            onChangeText={onChangeNote}
            placeholder="Add a note about this photo (optional)"
            placeholderTextColor={Colors.textTertiary}
            style={[styles.input, styles.noteInput]}
            textAlignVertical="top"
            value={note}
          />
          <Text style={styles.count}>{note.length}/300</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
  },
  embedded: {
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: Colors.surface,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  noteRow: {
    alignItems: 'flex-start',
  },
  fieldContent: {
    flex: 1,
    gap: 6,
  },
  label: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  input: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceRaised,
    color: Colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  noteInput: {
    minHeight: 88,
  },
  count: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'right',
  },
});
