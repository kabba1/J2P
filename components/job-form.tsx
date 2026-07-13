import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { Job, JobInput } from '@/types/job';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type JobFormProps = {
  initialJob?: Job;
  submitLabel: string;
  onSubmit: (input: JobInput) => Promise<void>;
};

type FieldProps = {
  label: string;
  icon: IoniconName;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
  onBlur?: () => void;
};

function FormField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  required,
  multiline,
  maxLength,
  onBlur,
}: FieldProps) {
  return (
    <View style={styles.fieldCard}>
      <View style={styles.fieldHeader}>
        <Text style={styles.label}>{label}</Text>
        {required ? <Text style={styles.required}>Required</Text> : null}
      </View>
      <View style={[styles.inputRow, multiline && styles.multilineRow]}>
        <Ionicons name={icon} size={23} color={Colors.primary} style={styles.fieldIcon} />
        <TextInput
          accessibilityLabel={label}
          autoCapitalize="sentences"
          maxLength={maxLength}
          multiline={multiline}
          onBlur={onBlur}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA3B2"
          returnKeyType={multiline ? 'default' : 'next'}
          style={[styles.input, multiline && styles.multilineInput]}
          textAlignVertical={multiline ? 'top' : 'center'}
          value={value}
        />
      </View>
      {maxLength ? (
        <Text style={styles.characterCount}>
          {value.length}/{maxLength}
        </Text>
      ) : null}
    </View>
  );
}

export function JobForm({ initialJob, submitLabel, onSubmit }: JobFormProps) {
  const [name, setName] = useState(initialJob?.name ?? '');
  const [customer, setCustomer] = useState(initialJob?.customer ?? '');
  const [address, setAddress] = useState(initialJob?.address ?? '');
  const [serviceType, setServiceType] = useState(initialJob?.serviceType ?? '');
  const [notes, setNotes] = useState(initialJob?.notes ?? '');
  const [nameTouched, setNameTouched] = useState(false);
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const nameIsBlank = !name.trim();

  const handleSubmit = async () => {
    setNameTouched(true);
    if (nameIsBlank) {
      setError('Enter a job name to continue.');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      await onSubmit({ name, customer, address, serviceType, notes });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save this job.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={8}
      style={styles.keyboardView}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
        <FormField
          label="Job Name"
          icon="briefcase-outline"
          value={name}
          onChangeText={(value) => {
            setName(value);
            if (error) setError(undefined);
          }}
          onBlur={() => setNameTouched(true)}
          placeholder="Johnson House Interior Repaint"
          required
        />
        {nameTouched && nameIsBlank ? (
          <Text accessibilityRole="alert" style={styles.validation}>
            Job name is required.
          </Text>
        ) : null}
        <FormField
          label="Customer"
          icon="person-outline"
          value={customer}
          onChangeText={setCustomer}
          placeholder="Customer name (optional)"
        />
        <FormField
          label="Address"
          icon="location-outline"
          value={address}
          onChangeText={setAddress}
          placeholder="Job address (optional)"
        />
        <FormField
          label="Service Type"
          icon="construct-outline"
          value={serviceType}
          onChangeText={setServiceType}
          placeholder="Painting, pressure washing…"
        />
        <FormField
          label="Notes"
          icon="document-text-outline"
          value={notes}
          onChangeText={setNotes}
          placeholder="Scope, access details, or reminders (optional)"
          multiline
          maxLength={300}
        />
        {error ? (
          <Text accessibilityRole="alert" style={styles.validation}>
            {error}
          </Text>
        ) : null}
        <PrimaryButton
          label={submitLabel}
          icon={initialJob ? 'checkmark' : 'add'}
          disabled={nameIsBlank}
          loading={submitting}
          onPress={() => void handleSubmit()}
          style={styles.submitButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  fieldCard: {
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  required: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  inputRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  multilineRow: {
    alignItems: 'flex-start',
  },
  fieldIcon: {
    marginRight: Spacing.md,
    marginTop: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 0,
    color: Colors.text,
    fontSize: 17,
    lineHeight: 23,
  },
  multilineInput: {
    minHeight: 92,
    paddingTop: 0,
  },
  characterCount: {
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: 'right',
  },
  validation: {
    color: Colors.danger,
    fontSize: 14,
    lineHeight: 20,
    marginHorizontal: Spacing.xs,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
});
