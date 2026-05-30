import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useThemeContext} from '../../theme/ThemeContext';
import {COLORS, FONTS, SPACING, RADIUS} from '../../theme/aaaTheme';
import {
  isValidAadhar,
  isValidIndianMobile,
  normalizeAadhar,
  normalizeMobile,
  formatAadharGrouped,
} from '../../utils/aadharValidator';
import {adminLogin} from '../../../sync/adminApi';
import {useSession} from '../../auth/sessionStore';
import {ApiError} from '../../../sync/httpClient';

export default function AdminLoginScreen() {
  const {t} = useTranslation();
  const {isAAA} = useThemeContext();
  const navigation = useNavigation<any>();
  const c = isAAA ? COLORS.aaa : COLORS.normal;
  const f = isAAA ? FONTS.aaa : FONTS.normal;

  const [mobile, setMobile] = useState('');
  const [aadhar, setAadhar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginAsAdmin = useSession(s => s.loginAsAdmin);

  const handleLogin = async () => {
    setError(null);
    if (!isValidIndianMobile(mobile)) {
      setError(t('admin_login.err_mobile', 'Invalid mobile number'));
      return;
    }
    if (!isValidAadhar(aadhar)) {
      setError(t('admin_login.err_aadhar', 'Invalid Aadhar number'));
      return;
    }
    setLoading(true);
    try {
      const resp = await adminLogin({
        mobile: normalizeMobile(mobile),
        aadhar: normalizeAadhar(aadhar),
      });
      await loginAsAdmin(resp.access_token, resp.expires_in, resp.admin);
      navigation.reset({index: 0, routes: [{name: 'AdminMain'}]});
    } catch (e: any) {
      const msg =
        e instanceof ApiError
          ? e.status === 401
            ? t('admin_login.invalid', 'Mobile or Aadhar does not match')
            : e.detail
          : e?.message || t('admin_login.failed', 'Login failed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: c.bg}]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{flex: 1}}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={[styles.backText, {color: c.textSecondary, fontSize: f.body}]}>
              ‹ {t('common.back')}
            </Text>
          </TouchableOpacity>

          <Text style={styles.emoji}>🛡️</Text>
          <Text style={[styles.title, {color: c.text, fontSize: f.titleLg}]}>
            {t('admin_login.title', 'Admin Login')}
          </Text>
          <Text style={[styles.subtitle, {color: c.textSecondary, fontSize: f.body}]}>
            {t('admin_login.subtitle', 'Enter your registered mobile and Aadhar')}
          </Text>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, {color: c.text, fontSize: f.body}]}>
              {t('admin_login.mobile_label', 'Mobile Number')}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: c.surface,
                  color: c.text,
                  borderColor: c.border,
                  fontSize: f.body,
                },
              ]}
              value={mobile}
              onChangeText={setMobile}
              placeholder={t('admin_login.mobile_ph', '10-digit mobile')}
              placeholderTextColor={c.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              autoFocus
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, {color: c.text, fontSize: f.body}]}>
              {t('admin_login.aadhar_label', 'Aadhar Number')}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: c.surface,
                  color: c.text,
                  borderColor: c.border,
                  fontSize: f.body,
                },
              ]}
              value={formatAadharGrouped(aadhar)}
              onChangeText={txt => setAadhar(normalizeAadhar(txt))}
              placeholder="XXXX XXXX XXXX"
              placeholderTextColor={c.textMuted}
              keyboardType="number-pad"
              maxLength={14}
            />
          </View>

          {error && (
            <Text style={[styles.errorText, {fontSize: f.body}]}>{error}</Text>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, {backgroundColor: c.primary}, loading && {opacity: 0.6}]}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color={isAAA ? '#000' : '#FFF'} />
            ) : (
              <Text style={[styles.primaryBtnText, {color: isAAA ? '#000' : '#FFF', fontSize: f.action}]}>
                {t('admin_login.btn', 'Login')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('AdminSignup')}>
            <Text style={[styles.linkText, {color: c.primary, fontSize: f.body}]}>
              {t('admin_login.no_account', 'No account? Sign up as admin')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  scroll: {padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.lg},
  backBtn: {paddingVertical: SPACING.sm},
  backText: {fontWeight: '600'},
  emoji: {fontSize: 64, textAlign: 'center'},
  title: {fontWeight: '800', textAlign: 'center'},
  subtitle: {textAlign: 'center', marginBottom: SPACING.md},
  field: {gap: SPACING.xs},
  fieldLabel: {fontWeight: '600'},
  input: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1.5,
  },
  errorText: {color: '#FCA5A5', textAlign: 'center'},
  primaryBtn: {
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  primaryBtnText: {fontWeight: '800'},
  linkText: {textAlign: 'center', marginTop: SPACING.md, fontWeight: '600'},
});
