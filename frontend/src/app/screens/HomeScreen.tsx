import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/RootStack';
import {useThemeContext} from '../theme/ThemeContext';
import {COLORS} from '../theme/aaaTheme';
import {syncPendingEvents, getQueueSize} from '../../sync/syncWorker';
import {triggerPunchSync, getCurrentUnsyncedCount} from '../../sync/punchSyncWorker';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({navigation}: Props) {
  const {isAAA} = useThemeContext();
  const {t} = useTranslation();
  const c = isAAA ? COLORS.aaa : COLORS.normal;

  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    const legacy = await getQueueSize();
    const punch = getCurrentUnsyncedCount();
    setPendingCount(legacy + punch);
  }, []);

  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 5000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const [legacyResult, punchResult] = await Promise.all([
        syncPendingEvents(),
        triggerPunchSync(),
      ]);
      const totalSynced = legacyResult.synced + punchResult.synced;
      const anyFailed = legacyResult.failed || punchResult.networkError;
      await refreshPendingCount();
      if (anyFailed) {
        Alert.alert(t('sync.title'), t('sync.partial', {count: totalSynced}));
      } else if (totalSynced > 0) {
        Alert.alert(t('sync.title'), t('sync.success', {count: totalSynced}));
      } else {
        Alert.alert(t('sync.title'), t('sync.empty'));
      }
    } catch {
      Alert.alert(t('sync.title'), t('sync.error'));
    } finally {
      setSyncing(false);
    }
  }, [refreshPendingCount, t]);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: c.bg}]}>
      <StatusBar barStyle="light-content" backgroundColor={c.bg} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header band — NHAI branding */}
        <View style={[styles.headerBand, {backgroundColor: c.surface}]}>
          <View style={styles.headerRow}>
            <View style={[styles.logoCircle, {borderColor: c.accent}]}>
              <Text style={[styles.logoText, {color: c.accent}]}>NFA</Text>
            </View>
            <View style={styles.headerTitleBlock}>
              <Text style={[styles.appTitle, {color: c.text}]}>
                NHAI Face Auth
              </Text>
              <Text style={[styles.appSubtitle, {color: c.textSecondary}]}>
                {t('home.subtitle')}
              </Text>
            </View>
          </View>
          {/* Decorative road accent */}
          <View style={[styles.roadAccent, {backgroundColor: c.accent}]} />
        </View>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[styles.greetingHi, {color: c.text}]}>नमस्ते 🙏</Text>
          <Text style={[styles.greetingSub, {color: c.textSecondary}]}>
            Worker attendance system
          </Text>
        </View>

        {/* Primary action — Verify (large card) */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.primaryCard,
            {backgroundColor: c.primary, shadowColor: c.primary},
          ]}
          onPress={() => navigation.navigate('Verify')}>
          <View style={styles.cardIconWrap}>
            <Text style={styles.cardIcon}>📸</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, {color: '#fff'}]}>
              {t('home.verify')}
            </Text>
            <Text style={[styles.cardSubtitle, {color: 'rgba(255,255,255,0.85)'}]}>
              Check-in with face
            </Text>
          </View>
          <Text style={[styles.cardArrow, {color: '#fff'}]}>→</Text>
        </TouchableOpacity>

        {/* Secondary action — Enroll */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.secondaryCard,
            {
              backgroundColor: c.surface,
              borderColor: c.accent,
              borderWidth: isAAA ? 2 : 1.5,
            },
          ]}
          onPress={() => navigation.navigate('Enroll')}>
          <View style={styles.cardIconWrap}>
            <Text style={styles.cardIcon}>➕</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, {color: c.text}]}>
              {t('home.enroll')}
            </Text>
            <Text style={[styles.cardSubtitle, {color: c.textSecondary}]}>
              Register a new worker
            </Text>
          </View>
          <Text style={[styles.cardArrow, {color: c.accent}]}>→</Text>
        </TouchableOpacity>

        {/* Sync button */}
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={syncing}
          style={[
            styles.syncCard,
            {
              backgroundColor: pendingCount > 0 ? c.accent : c.surface,
              borderColor: c.accent,
              borderWidth: pendingCount > 0 ? 0 : 1.5,
            },
          ]}
          onPress={handleSync}>
          <View style={styles.cardIconWrap}>
            {syncing ? (
              <ActivityIndicator color={pendingCount > 0 ? '#000' : c.accent} size="small" />
            ) : (
              <Text style={styles.cardIcon}>🔄</Text>
            )}
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, {color: pendingCount > 0 ? '#000' : c.text}]}>
              {syncing ? t('sync.syncing') : t('sync.button')}
            </Text>
            <Text style={[styles.cardSubtitle, {color: pendingCount > 0 ? 'rgba(0,0,0,0.7)' : c.textSecondary}]}>
              {pendingCount > 0
                ? t('sync.pending', {count: pendingCount})
                : t('sync.up_to_date')}
            </Text>
          </View>
          {pendingCount > 0 && (
            <View style={styles.syncBadge}>
              <Text style={styles.syncBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Tertiary — Admin */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.adminPill, {borderColor: c.border}]}
          onPress={() => navigation.navigate('Admin')}>
          <Text style={[styles.adminIcon, {color: c.textSecondary}]}>⚙️</Text>
          <Text style={[styles.adminText, {color: c.textSecondary}]}>
            {t('home.admin')}
          </Text>
        </TouchableOpacity>

        {/* Footer — feature badges */}
        <View style={styles.featureRow}>
          <View style={[styles.featureBadge, {borderColor: c.success}]}>
            <Text style={[styles.featureBadgeText, {color: c.success}]}>
              ✓ Offline
            </Text>
          </View>
          <View style={[styles.featureBadge, {borderColor: c.primary}]}>
            <Text style={[styles.featureBadgeText, {color: c.primary}]}>
              🔒 BioHash
            </Text>
          </View>
          <View style={[styles.featureBadge, {borderColor: c.accent}]}>
            <Text style={[styles.featureBadgeText, {color: c.accent}]}>
              🇮🇳 DPDPA
            </Text>
          </View>
        </View>

        <Text style={[styles.versionText, {color: c.textMuted}]}>
          v1.0 • Powered by EdgeFace + ML Kit
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  scroll: {padding: 20, paddingBottom: 40},
  headerBand: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitleBlock: {flex: 1},
  appTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  appSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  roadAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.7,
  },
  greeting: {marginBottom: 24, paddingHorizontal: 4},
  greetingHi: {
    fontSize: 26,
    fontWeight: '700',
  },
  greetingSub: {
    fontSize: 14,
    marginTop: 4,
  },
  primaryCard: {
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  secondaryCard: {
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardIcon: {fontSize: 26},
  cardContent: {flex: 1},
  cardTitle: {
    fontSize: 19,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  cardArrow: {
    fontSize: 24,
    fontWeight: '300',
  },
  syncCard: {
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  syncBadge: {
    backgroundColor: '#d32f2f',
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  syncBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  adminPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  adminIcon: {fontSize: 16},
  adminText: {fontSize: 14, fontWeight: '600'},
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 28,
  },
  featureBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  featureBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  versionText: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 16,
  },
});
