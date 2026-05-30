import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useNavigation, CommonActions} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useThemeContext} from '../../theme/ThemeContext';
import {COLORS, FONTS, SPACING, RADIUS} from '../../theme/aaaTheme';
import {useSession} from '../../auth/sessionStore';
import {getApiBaseUrl} from '../../../sync/httpClient';

export default function AdminSettingsScreen() {
  const {t, i18n} = useTranslation();
  const {isAAA, toggleTheme} = useThemeContext();
  const navigation = useNavigation<any>();
  const c = isAAA ? COLORS.aaa : COLORS.normal;
  const f = isAAA ? FONTS.aaa : FONTS.normal;

  const admin = useSession(s => s.admin);
  const logout = useSession(s => s.logout);

  const handleLogout = () => {
    Alert.alert(
      t('settings.logout_title', 'Logout?'),
      t('settings.logout_msg', 'You will need to log in again.'),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('settings.logout', 'Logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.dispatch(
              CommonActions.reset({index: 0, routes: [{name: 'Welcome'}]}),
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: c.bg}]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, {color: c.text, fontSize: f.titleLg}]}>
          {t('settings.title', 'Settings')}
        </Text>

        <View style={[styles.card, {backgroundColor: c.surface, borderColor: c.border}]}>
          <Text style={[styles.cardTitle, {color: c.text, fontSize: f.body}]}>
            {t('settings.account', 'Account')}
          </Text>
          <Text style={[styles.cardValue, {color: c.text, fontSize: f.bodyLg}]}>
            {admin?.name || '—'}
          </Text>
          <Text style={[styles.cardSub, {color: c.textSecondary, fontSize: f.caption}]}>
            {admin?.mobile || '—'} · {admin?.aadhar_masked || '—'}
          </Text>
        </View>

        <View style={[styles.card, {backgroundColor: c.surface, borderColor: c.border}]}>
          <View style={styles.row}>
            <View style={{flex: 1}}>
              <Text style={[styles.rowLabel, {color: c.text, fontSize: f.body}]}>
                {t('settings.aaa_mode', 'AAA Outdoor Mode')}
              </Text>
              <Text style={[styles.rowHint, {color: c.textSecondary, fontSize: f.caption}]}>
                {t('settings.aaa_hint', 'High contrast for sunlight + gloves')}
              </Text>
            </View>
            <Switch
              value={isAAA}
              onValueChange={toggleTheme}
              trackColor={{false: '#475569', true: '#FFD700'}}
              thumbColor={isAAA ? '#FFA500' : '#FFF'}
            />
          </View>
        </View>

        <View style={[styles.card, {backgroundColor: c.surface, borderColor: c.border}]}>
          <Text style={[styles.cardTitle, {color: c.text, fontSize: f.body}]}>
            {t('settings.language', 'Language')}
          </Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[
                styles.langBtn,
                {borderColor: c.border, backgroundColor: i18n.language === 'en' ? c.primary : 'transparent'},
              ]}
              onPress={() => i18n.changeLanguage('en')}>
              <Text style={{color: i18n.language === 'en' ? '#000' : c.text, fontWeight: '700'}}>
                English
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.langBtn,
                {borderColor: c.border, backgroundColor: i18n.language === 'hi' ? c.primary : 'transparent'},
              ]}
              onPress={() => i18n.changeLanguage('hi')}>
              <Text style={{color: i18n.language === 'hi' ? '#000' : c.text, fontWeight: '700'}}>
                हिंदी
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, {backgroundColor: c.surface, borderColor: c.border}]}>
          <Text style={[styles.cardTitle, {color: c.text, fontSize: f.body}]}>
            {t('settings.api', 'Backend API')}
          </Text>
          <Text style={[styles.cardSub, {color: c.textSecondary, fontSize: f.caption}]}>
            {getApiBaseUrl()}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, {borderColor: c.danger}]}
          onPress={handleLogout}>
          <Text style={[styles.logoutText, {color: c.danger, fontSize: f.action}]}>
            {t('settings.logout', 'Logout')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  scroll: {padding: SPACING.lg, gap: SPACING.md},
  title: {fontWeight: '800', marginBottom: SPACING.md},
  card: {
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  cardTitle: {fontWeight: '600'},
  cardValue: {fontWeight: '700'},
  cardSub: {},
  row: {flexDirection: 'row', alignItems: 'center'},
  rowLabel: {fontWeight: '600'},
  rowHint: {marginTop: 2},
  langRow: {flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm},
  langBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  logoutBtn: {
    borderWidth: 2,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  logoutText: {fontWeight: '800'},
});
