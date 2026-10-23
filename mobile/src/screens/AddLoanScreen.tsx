import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createLoan } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AppStackParamList } from '../navigation/types';
import { BorderRadius, Colors, Spacing, Typography } from '../theme';

type Props = NativeStackScreenProps<AppStackParamList, 'AddLoan'>;
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export default function AddLoanScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async () => {
    setError(''); setSuccess('');
    const value = Number(amount);
    if (!friendName.trim() || !amount.trim() || !dueDate.trim()) return setError('Complete all fields to save this loan.');
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount greater than zero.');
    if (!validDate(dueDate.trim())) return setError('Enter a valid date in YYYY-MM-DD format.');
    if (!token) return setError('Your session has expired. Please sign in again.');
    setBusy(true);
    try {
      await createLoan(token, { friendName: friendName.trim(), amount: value, dueDate: dueDate.trim() });
      setSuccess('Loan saved successfully.');
      setTimeout(() => navigation.navigate('Tabs'), 600);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save loan.'); }
    finally { setBusy(false); }
  };

  return <SafeAreaView style={styles.safe} edges={['bottom']}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Record a loan</Text><Text style={styles.subtitle}>Keep track of money you lend to friends.</Text>
      <Text style={styles.label}>FRIEND’S NAME</Text><TextInput value={friendName} onChangeText={setFriendName} placeholder="e.g. Alex" style={styles.input} maxLength={100} returnKeyType="next" />
      <Text style={styles.label}>AMOUNT (₹)</Text><TextInput value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" style={styles.input} />
      <Text style={styles.label}>DUE DATE</Text><TextInput value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" style={styles.input} maxLength={10} />
      <Text style={styles.hint}>Use year-month-day format, for example 2026-12-31.</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {success ? <Text accessibilityRole="alert" style={styles.success}>{success}</Text> : null}
      <TouchableOpacity style={[styles.button, busy && styles.disabled]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Save loan</Text>}
      </TouchableOpacity>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background }, flex: { flex: 1 },
  content: { padding: Spacing.lg, flexGrow: 1 }, title: { ...Typography.heading1, color: Colors.textPrimary, marginTop: Spacing.md },
  subtitle: { ...Typography.bodyMedium, color: Colors.textSecondary, marginBottom: Spacing.xl, marginTop: Spacing.xs },
  label: { ...Typography.labelMedium, color: Colors.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.md },
  input: { backgroundColor: 'white', borderColor: Colors.border, borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.textPrimary, fontSize: 16 },
  hint: { ...Typography.bodySmall, color: Colors.textSecondary, marginTop: Spacing.xs },
  error: { ...Typography.bodyMedium, color: Colors.danger, marginTop: Spacing.md }, success: { ...Typography.bodyMedium, color: Colors.accent, marginTop: Spacing.md },
  button: { marginTop: Spacing.xl, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryDark, padding: Spacing.md, alignItems: 'center' },
  buttonText: { ...Typography.labelLarge, color: 'white' }, disabled: { opacity: 0.6 },
});
