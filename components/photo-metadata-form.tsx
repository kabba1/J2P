import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

type PhotoMetadataFormProps = {
  shotName: string;
  note: string;
  onChangeShotName: (value: string) => void;
  onChangeNote: (value: string) => void;
};

export function PhotoMetadataForm({
  shotName,
  note,
  onChangeShotName,
  onChangeNote,
}: PhotoMetadataFormProps) {
  return (
    <View style={styles.card}>
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
            placeholderTextColor="#9AA3B2"
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
            placeholderTextColor="#9AA3B2"
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
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
  },
  fieldRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  noteRow: {
    alignItems: 'flex-start',
    borderBottomWidth: 0,
  },
  fieldContent: {
    flex: 1,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  input: {
    minHeight: 44,
    paddingVertical: 0,
    color: Colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  noteInput: {
    minHeight: 72,
    paddingTop: Spacing.sm,
  },
  count: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'right',
  },
});
