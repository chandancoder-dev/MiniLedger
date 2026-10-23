import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestOtp, verifyOtp } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../theme';

type Step = 'phone' | 'otp';

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleRequestOtp = async () => {
    const rawPhone = phone.trim().replace(/[\s()-]/g, '');
    const normalized = /^\d{10}$/.test(rawPhone) ? `+91${rawPhone}` : rawPhone;
    if (!/^\+?[1-9]\d{9,14}$/.test(normalized)) {
      setError('Enter a valid phone number with 10–15 digits');
      shake();
      return;
    }
    setError('');
    setLoading(true);
    try {
      await requestOtp(normalized);
      setStep('otp');
    } catch (e: any) {
      setError(e.message);
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the 6-digit OTP from backend terminal');
      shake();
      return;
    }
    setError('');
    setLoading(true);
    try {
      const rawPhone = phone.trim().replace(/[\s()-]/g, '');
      const normalizedPhone = /^\d{10}$/.test(rawPhone) ? `+91${rawPhone}` : rawPhone;
      const { token, user } = await verifyOtp(normalizedPhone, otp.trim());
      await signIn(token, user);
    } catch (e: any) {
      setError(e.message);
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View
            style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoEmoji}>💰</Text>
              </View>
            </View>
            <Text style={styles.appName}>MiniLedger</Text>
            <Text style={styles.tagline}>Track loans between friends,{'\n'}effortlessly.</Text>
          </Animated.View>

          {/* Card */}
          <Animated.View
            style={[
              styles.card,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { translateX: shakeAnim }] },
            ]}
          >
            {step === 'phone' ? (
              <>
                <Text style={styles.cardTitle}>Get Started</Text>
                <Text style={styles.cardSubtitle}>We'll send a one-time code to verify your identity</Text>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.inputRow}>
                    <View style={styles.countryCode}>
                      <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="9876543210"
                      placeholderTextColor={Colors.textTertiary}
                      keyboardType="phone-pad"
                      maxLength={15}
                      autoFocus
                    />
                  </View>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleRequestOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.buttonText}>Send OTP →</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Enter OTP</Text>
                <Text style={styles.cardSubtitle}>
                  Check the <Text style={styles.highlight}>backend terminal</Text> for your mock OTP
                </Text>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>6-digit OTP</Text>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    value={otp}
                    onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    textAlign="center"
                  />
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <Text style={styles.buttonText}>Verify & Login →</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => { setStep('phone'); setError(''); setOtp(''); }}
                >
                  <Text style={styles.backBtnText}>← Change number</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    marginBottom: Spacing.md,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appName: {
    ...Typography.displayMedium,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  tagline: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.md,
  },
  cardTitle: {
    ...Typography.heading1,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  highlight: {
    color: Colors.primary,
    fontWeight: '600',
  },
  inputWrapper: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...Typography.labelMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  countryCode: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRightWidth: 1.5,
    borderRightColor: Colors.border,
    backgroundColor: Colors.divider,
  },
  countryCodeText: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
  },
  input: {
    flex: 1,
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  otpInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    paddingVertical: Spacing.md,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.danger,
    marginBottom: Spacing.sm,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...Typography.labelLarge,
    color: Colors.textInverse,
    fontSize: 16,
  },
  backBtn: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  backBtnText: {
    ...Typography.bodyMedium,
    color: Colors.primary,
  },
});
