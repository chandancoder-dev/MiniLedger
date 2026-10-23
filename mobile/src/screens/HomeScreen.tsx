import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { getLoanSummary, getLoans, LoanSummary, Loan } from '../api/client';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../theme';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/types';
import { useFocusEffect } from '@react-navigation/native';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'Tabs'>;
};

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

export default function HomeScreen({ navigation }: Props) {
  const { user, token, signOut } = useAuth();
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [recentLoans, setRecentLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const load = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (!isRefresh) setLoading(true);
    setError('');
    try {
      const [s, loans] = await Promise.all([
        getLoanSummary(token),
        getLoans(token),
      ]);
      setSummary(s);
      setRecentLoans(loans.slice(0, 3));
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(true); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your ledger…</Text>
      </View>
    );
  }

  const outstanding = summary ? summary.totalLent - summary.totalRepaid : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.phone}>{user?.phone}</Text>
          </View>
          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => load()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Hero Summary Card */}
        <Animated.View style={[styles.heroCard, { opacity: fadeAnim }]}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Outstanding</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>LENT</Text>
            </View>
          </View>
          <Text style={styles.heroAmount}>{formatCurrency(outstanding)}</Text>
          <Text style={styles.heroSub}>of {formatCurrency(summary?.totalLent ?? 0)} total lent</Text>

          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Repaid</Text>
              <Text style={styles.heroStatValue}>{formatCurrency(summary?.totalRepaid ?? 0)}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, summary?.overdueAmount ? styles.overdueLabel : null]}>
                Overdue
              </Text>
              <Text style={[styles.heroStatValue, summary?.overdueAmount ? styles.overdueValue : null]}>
                {formatCurrency(summary?.overdueAmount ?? 0)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Quick Action */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddLoan')}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>+ Add New Loan</Text>
        </TouchableOpacity>

        {/* Recent Loans */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Loans</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tabs')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {recentLoans.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyTitle}>No loans yet</Text>
              <Text style={styles.emptySubtitle}>Add your first loan to start tracking</Text>
            </View>
          ) : (
            recentLoans.map((loan) => {
              const overdue = isOverdue(loan);
              const repaid = !!loan.repaidAt;
              return (
                <View key={loan.id} style={styles.loanCard}>
                  <View style={[styles.loanAvatar, repaid ? styles.avatarRepaid : overdue ? styles.avatarOverdue : styles.avatarPending]}>
                    <Text style={styles.loanAvatarText}>{loan.friendName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.loanInfo}>
                    <Text style={styles.loanName}>{loan.friendName}</Text>
                    <Text style={styles.loanDate}>Due {formatDate(loan.dueDate)}</Text>
                  </View>
                  <View style={styles.loanRight}>
                    <Text style={styles.loanAmount}>{formatCurrency(loan.amount)}</Text>
                    <View style={[
                      styles.statusChip,
                      repaid ? styles.chipRepaid : overdue ? styles.chipOverdue : styles.chipPending
                    ]}>
                      <Text style={[
                        styles.statusText,
                        repaid ? styles.textRepaid : overdue ? styles.textOverdue : styles.textPending
                      ]}>
                        {repaid ? 'Repaid' : overdue ? 'Overdue' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: Spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  loadingText: { ...Typography.bodyMedium, color: Colors.textSecondary, marginTop: Spacing.sm },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  greeting: { ...Typography.bodyMedium, color: Colors.textSecondary },
  phone: { ...Typography.heading3, color: Colors.textPrimary },
  signOutBtn: {
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  signOutText: { ...Typography.labelMedium, color: Colors.danger },

  errorBanner: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.dangerLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: { ...Typography.bodySmall, color: Colors.danger, flex: 1 },
  retryText: { ...Typography.labelMedium, color: Colors.primary, marginLeft: Spacing.sm },

  heroCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.lg,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  heroLabel: { ...Typography.labelMedium, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 1 },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  badgeText: { ...Typography.labelSmall, color: Colors.textInverse, letterSpacing: 1 },
  heroAmount: { ...Typography.displayLarge, color: Colors.textInverse, marginBottom: 2 },
  heroSub: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.65)', marginBottom: Spacing.lg },
  heroRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.md, padding: Spacing.md },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatLabel: { ...Typography.labelSmall, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  heroStatValue: { ...Typography.heading3, color: Colors.textInverse },
  heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  overdueLabel: { color: '#FFB3B3' },
  overdueValue: { color: '#FF8080' },

  addBtn: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadows.md,
  },
  addBtnText: { ...Typography.labelLarge, color: Colors.textInverse, fontSize: 16 },

  section: { marginTop: Spacing.xl, paddingHorizontal: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { ...Typography.heading2, color: Colors.textPrimary },
  seeAll: { ...Typography.labelMedium, color: Colors.primary },

  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.sm,
  },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.sm },
  emptyTitle: { ...Typography.heading3, color: Colors.textPrimary, marginBottom: Spacing.xs },
  emptySubtitle: { ...Typography.bodySmall, color: Colors.textSecondary },

  loanCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  loanAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarPending: { backgroundColor: Colors.primaryLight },
  avatarRepaid: { backgroundColor: Colors.accentLight },
  avatarOverdue: { backgroundColor: Colors.dangerLight },
  loanAvatarText: { ...Typography.heading3, color: Colors.primary },
  loanInfo: { flex: 1 },
  loanName: { ...Typography.labelLarge, color: Colors.textPrimary },
  loanDate: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  loanRight: { alignItems: 'flex-end' },
  loanAmount: { ...Typography.heading3, color: Colors.textPrimary, marginBottom: 4 },
  statusChip: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  chipPending: { backgroundColor: Colors.primaryLight },
  chipRepaid: { backgroundColor: Colors.accentLight },
  chipOverdue: { backgroundColor: Colors.dangerLight },
  statusText: { ...Typography.labelSmall },
  textPending: { color: Colors.primary },
  textRepaid: { color: Colors.accent },
  textOverdue: { color: Colors.danger },
});
