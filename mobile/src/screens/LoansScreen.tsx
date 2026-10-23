import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Alert,
  Platform,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getLoanSummary, getLoans, repayLoan, Loan } from '../api/client';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../theme';

function formatCurrency(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDate(d: string) {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isOverdue(loan: Loan) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return !loan.repaidAt && loan.dueDate < today;
}

type Filter = 'all' | 'pending' | 'repaid' | 'overdue';

export default function LoansScreen() {
  const { token } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [repayingId, setRepayingId] = useState<number | null>(null);
  const repayingIdRef = useRef<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (!isRefresh) setLoading(true);
    setError('');
    try {
      const data = await getLoans(token);
      setLoans(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleRepay = useCallback(async (loan: Loan) => {
    if (!token || loan.repaidAt || repayingIdRef.current !== null) return;

    // React Native Web's Alert.alert is a no-op, so its action callback never
    // fires in the browser. Use the browser's confirmation dialog on web.
    const confirmationMessage = `Mark ₹${loan.amount.toLocaleString('en-IN')} from ${loan.friendName} as repaid?`;
    repayingIdRef.current = loan.id;
    setRepayingId(loan.id);
    setError('');
    setSuccess('');

    try {
      let confirmed: boolean;
      if (Platform.OS === 'web') {
        confirmed = typeof window !== 'undefined' && window.confirm(confirmationMessage);
      } else {
        confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert('Mark as Repaid', confirmationMessage, [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Yes, Repaid', onPress: () => resolve(true) },
          ], { cancelable: true, onDismiss: () => resolve(false) });
        });
      }
      if (!confirmed) return;

      const updated = await repayLoan(token, loan.id);
      setLoans((current) => current.map((item) =>
        item.id === updated.id ? { ...item, repaidAt: updated.repaidAt } : item
      ));
      setSuccess(`${loan.friendName}'s loan was marked as repaid.`);

      // Refresh the list and summary. The dashboard reloads its summary when
      // focused, so returning to that tab shows the updated total.
      const [freshLoans] = await Promise.all([getLoans(token), getLoanSummary(token)]);
      setLoans(freshLoans);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark this loan as repaid.');
    } finally {
      repayingIdRef.current = null;
      setRepayingId(null);
    }
  }, [token]);

  const filtered = loans.filter((loan) => {
    if (filter === 'all') return true;
    if (filter === 'repaid') return !!loan.repaidAt;
    if (filter === 'overdue') return isOverdue(loan);
    if (filter === 'pending') return !loan.repaidAt && !isOverdue(loan);
    return true;
  });

  const filterTabs: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'repaid', label: 'Repaid' },
  ];

  const renderLoan = ({ item: loan }: { item: Loan }) => {
    const overdue = isOverdue(loan);
    const repaid = !!loan.repaidAt;
    const isRepaying = repayingId === loan.id;

    return (
      <View style={styles.loanCard}>
        <View style={styles.cardTop}>
          <View style={[styles.avatar, repaid ? styles.avatarRepaid : overdue ? styles.avatarOverdue : styles.avatarPending]}>
            <Text style={[styles.avatarText, repaid ? styles.avatarTextRepaid : overdue ? styles.avatarTextOverdue : styles.avatarTextPending]}>
              {loan.friendName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.friendName}>{loan.friendName}</Text>
            <Text style={styles.loanAmount}>{formatCurrency(loan.amount)}</Text>
          </View>
          <View style={[
            styles.statusChip,
            repaid ? styles.chipRepaid : overdue ? styles.chipOverdue : styles.chipPending,
          ]}>
            <Text style={[
              styles.statusText,
              repaid ? styles.textRepaid : overdue ? styles.textOverdue : styles.textPending,
            ]}>
              {repaid ? '✓ Repaid' : overdue ? '⚠ Overdue' : '○ Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.dateLabel}>Due Date</Text>
            <Text style={[styles.dateValue, overdue && !repaid ? styles.overdueDate : null]}>
              {formatDate(loan.dueDate)}
            </Text>
          </View>
          {repaid ? (
            <View>
              <Text style={styles.dateLabel}>Repaid On</Text>
              <Text style={styles.repaidDate}>{loan.repaidAt ? formatDate(loan.repaidAt.slice(0, 10)) : '—'}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.repayBtn, isRepaying && styles.repayBtnDisabled]}
              onPress={() => { void handleRepay(loan); }}
              disabled={isRepaying}
              activeOpacity={0.8}
            >
              {isRepaying ? (
                <ActivityIndicator size="small" color={Colors.textInverse} />
              ) : (
                <Text style={styles.repayBtnText}>Mark Repaid</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Loans</Text>
        <Text style={styles.headerCount}>{filtered.length} {filtered.length === 1 ? 'loan' : 'loans'}</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filters}>
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterText, filter === tab.key && styles.filterTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {success ? <Text accessibilityRole="alert" style={styles.successBanner}>{success}</Text> : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderLoan}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No loans found</Text>
              <Text style={styles.emptySubtitle}>
                {filter !== 'all' ? 'Try switching the filter above' : 'Add your first loan from the Home tab'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: { ...Typography.heading1, color: Colors.textPrimary },
  headerCount: { ...Typography.bodySmall, color: Colors.textSecondary },

  filters: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: { ...Typography.labelMedium, color: Colors.textSecondary },
  filterTextActive: { color: Colors.textInverse },

  errorBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.dangerLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  errorText: { ...Typography.bodySmall, color: Colors.danger },
  successBanner: {
    ...Typography.bodySmall,
    color: Colors.accentDark,
    backgroundColor: Colors.accentLight,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryText: { ...Typography.labelMedium, color: Colors.primary },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },

  loanCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarPending: { backgroundColor: Colors.primaryLight },
  avatarRepaid: { backgroundColor: Colors.accentLight },
  avatarOverdue: { backgroundColor: Colors.dangerLight },
  avatarText: { ...Typography.heading2, fontWeight: '700' },
  avatarTextPending: { color: Colors.primary },
  avatarTextRepaid: { color: Colors.accent },
  avatarTextOverdue: { color: Colors.danger },
  cardInfo: { flex: 1 },
  friendName: { ...Typography.labelLarge, color: Colors.textPrimary, marginBottom: 2 },
  loanAmount: { ...Typography.heading3, color: Colors.textPrimary },
  statusChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  chipPending: { backgroundColor: Colors.primaryLight },
  chipRepaid: { backgroundColor: Colors.accentLight },
  chipOverdue: { backgroundColor: Colors.dangerLight },
  statusText: { ...Typography.labelSmall },
  textPending: { color: Colors.primary },
  textRepaid: { color: Colors.accent },
  textOverdue: { color: Colors.danger },

  cardDivider: { height: 1, backgroundColor: Colors.divider, marginHorizontal: Spacing.md },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  dateLabel: { ...Typography.caption, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateValue: { ...Typography.labelLarge, color: Colors.textPrimary },
  overdueDate: { color: Colors.danger },
  repaidDate: { ...Typography.labelLarge, color: Colors.accent },
  repayBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 110,
    alignItems: 'center',
    ...Shadows.sm,
  },
  repayBtnDisabled: { opacity: 0.6 },
  repayBtnText: { ...Typography.labelLarge, color: Colors.textInverse },

  emptyContainer: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.heading3, color: Colors.textPrimary, marginBottom: Spacing.xs },
  emptySubtitle: { ...Typography.bodySmall, color: Colors.textSecondary, textAlign: 'center' },
});
