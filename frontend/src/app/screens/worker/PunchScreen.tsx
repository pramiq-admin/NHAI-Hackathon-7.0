import React, {useCallback, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useFocusEffect, CommonActions} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useThemeContext} from '../../theme/ThemeContext';
import {COLORS, FONTS, SPACING, RADIUS} from '../../theme/aaaTheme';
import {useSession} from '../../auth/sessionStore';
import {usePunchStatus} from '../../hooks/usePunchStatus';
import {formatTimeOfDay, formatDate} from '../../utils/timeCalc';
import SyncStatusBadge from '../../components/SyncStatusBadge';
import {triggerPunchSync} from '../../../sync/punchSyncWorker';

export default function PunchScreen() {
  const {t} = useTranslation();
  const {isAAA} = useThemeContext();
  const navigation = useNavigation<any>();
  const c = isAAA ? COLORS.aaa : COLORS.normal;
  const f = isAAA ? FONTS.aaa : FONTS.normal;

  const role = useSession(s => s.role);
  const worker = useSession(s => s.worker);
  const isExpired = useSession(s => s.isExpired);
  const logout = useSession(s => s.logout);
  const hydrated = useSession(s => s.hydrated);
  const status = usePunchStatus(worker?.id);

  useFocusEffect(
    useCallback(() => {
      // attempt background sync on focus
      triggerPunchSync().catch(() => {});
    }, []),
  );

  // Guard: if the worker session disappears, expires, or the role changed,
  // kick back to Welcome rather than sitting on a stale "Loading..." view.
  useEffect(() => {
    if (!hydrated) return;
    if (role !== 'worker' || !worker || isExpired()) {
      // logout is async; fire-and-forget — we're navigating away anyway and
      // the keychain wipe doesn't block the redirect.
      if (role !== null) logout().catch(() => {});
      navigation.dispatch(
        CommonActions.reset({index: 0, routes: [{name: 'Welcome'}]}),
      );
    }
  }, [hydrated, role, worker, isExpired, logout, navigation]);

  if (!worker) {
    return (
      <SafeAreaView
        style={[styles.safe, {backgroundColor: c.bg, justifyContent: 'center'}]}>
        <ActivityIndicator color={c.primary} size="large" />
      </SafeAreaView>
    );
  }

  const handleLogout = () => {
    Alert.alert(t('punch.logout_title', 'Logout?'), t('punch.logout_msg', 'You will need to log in again.'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.confirm'),
        onPress: async () => {
          await logout();
          navigation.dispatch(
            CommonActions.reset({index: 0, routes: [{name: 'Welcome'}]}),
          );
        },
      },
    ]);
  };

  const handlePunchIn = () => {
    if (status.kind === 'punched_in') {
      Alert.alert(t('punch.already_in', 'Already punched in'));
      return;
    }
    if (status.kind === 'completed') {
      Alert.alert(
        t('punch.day_complete_title', 'Day complete'),
        t('punch.day_complete_msg', 'You have already punched out today. Come back tomorrow.'),
      );
      return;
    }
    navigation.navigate('PunchCapture', {type: 'in'});
  };

  const handlePunchOut = () => {
    if (status.kind !== 'punched_in') {
      Alert.alert(t('punch.not_in', 'Punch in first before punching out'));
      return;
    }
    navigation.navigate('PunchCapture', {type: 'out'});
  };

  const isPunchIn = status.kind === 'idle';
  const isPunchOut = status.kind === 'punched_in';
  const isDayDone = status.kind === 'completed';

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: c.bg}]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{flex: 1}}>
            <Text style={[styles.greeting, {color: c.textSecondary, fontSize: f.body}]}>
              {t('punch.hello', 'Hello')},
            </Text>
            <Text style={[styles.workerName, {color: c.text, fontSize: f.title}]}>
              {worker.name}
            </Text>
            <Text style={[styles.workerMeta, {color: c.textMuted, fontSize: f.caption}]}>
              {worker.aadhar_masked}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <SyncStatusBadge />
            <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
              <Text style={{fontSize: 28}}>⏻</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.date, {color: c.textSecondary, fontSize: f.body}]}>
          {formatDate(Date.now())}
        </Text>

        {/* Status banner */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: c.surface,
              borderColor:
                status.kind === 'punched_in'
                  ? c.success
                  : status.kind === 'completed'
                    ? c.accent
                    : c.border,
            },
          ]}>
          <Text style={[styles.statusLabel, {color: c.textSecondary, fontSize: f.caption}]}>
            {t('punch.today_status', "Today's status")}
          </Text>
          <Text
            style={[
              styles.statusText,
              {
                color:
                  status.kind === 'punched_in'
                    ? c.success
                    : status.kind === 'completed'
                      ? c.accent
                      : c.text,
                fontSize: f.title,
              },
            ]}>
            {status.kind === 'idle' && t('punch.status_idle', 'Not punched in')}
            {status.kind === 'punched_in' &&
              `${t('punch.status_in', 'Punched in at')} ${formatTimeOfDay(status.lastPunchIn!.timestamp)}`}
            {status.kind === 'completed' && t('punch.status_done', 'Day complete')}
          </Text>
          {status.todayDuration && (
            <Text style={[styles.statusDuration, {color: c.text, fontSize: f.bodyLg}]}>
              {status.kind === 'completed'
                ? t('punch.total_hours', 'Total')
                : t('punch.elapsed', 'Elapsed')}
              : {status.todayDuration.formatted}
            </Text>
          )}
          {status.kind === 'completed' && status.lastPunchOut && (
            <Text style={[styles.statusOut, {color: c.textMuted, fontSize: f.caption}]}>
              {t('punch.out_at', 'Out at')}: {formatTimeOfDay(status.lastPunchOut.timestamp)}
            </Text>
          )}
        </View>

        {/* Big circular punch button */}
        <View style={styles.bigButtonWrap}>
          <TouchableOpacity
            disabled={isDayDone}
            style={[
              styles.bigBtn,
              {
                backgroundColor: isDayDone
                  ? c.textMuted
                  : isPunchOut
                    ? c.accent
                    : c.success,
                borderColor: c.border,
                opacity: isDayDone ? 0.5 : 1,
              },
            ]}
            onPress={isPunchIn ? handlePunchIn : isPunchOut ? handlePunchOut : undefined}>
            <Text style={[styles.bigBtnEmoji]}>
              {isDayDone ? '✓' : isPunchOut ? '🚪' : '📸'}
            </Text>
            <Text style={[styles.bigBtnText, {color: '#FFF', fontSize: f.titleLg}]}>
              {isDayDone
                ? t('punch.day_complete', 'DAY COMPLETE')
                : isPunchOut
                  ? t('punch.punch_out', 'PUNCH OUT')
                  : t('punch.punch_in', 'PUNCH IN')}
            </Text>
            {!isDayDone && (
              <Text style={[styles.bigBtnSub, {color: 'rgba(255,255,255,0.85)', fontSize: f.body}]}>
                {t('punch.tap_to_verify', 'Tap to verify face')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Calendar link */}
        <TouchableOpacity
          style={styles.calendarLink}
          onPress={() => navigation.navigate('WorkerCalendar')}>
          <Text style={[styles.calendarLinkText, {color: c.primary, fontSize: f.body}]}>
            📅 {t('punch.view_calendar', 'View attendance history')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  scroll: {padding: SPACING.lg, paddingBottom: SPACING.xxl},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  greeting: {},
  workerName: {fontWeight: '800'},
  workerMeta: {marginTop: 2},
  headerRight: {alignItems: 'flex-end', gap: SPACING.sm},
  logoutIcon: {padding: SPACING.xs},
  date: {marginBottom: SPACING.lg},
  statusCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 2,
    marginBottom: SPACING.xl,
    gap: SPACING.xs,
  },
  statusLabel: {fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5},
  statusText: {fontWeight: '800'},
  statusDuration: {fontWeight: '700', marginTop: SPACING.xs},
  statusOut: {marginTop: 2},
  bigButtonWrap: {alignItems: 'center', marginVertical: SPACING.xl},
  bigBtn: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 12,
    gap: SPACING.xs,
  },
  bigBtnEmoji: {fontSize: 64},
  bigBtnText: {fontWeight: '900', letterSpacing: 1},
  bigBtnSub: {marginTop: 4},
  calendarLink: {alignItems: 'center', padding: SPACING.lg},
  calendarLinkText: {fontWeight: '700'},
});
