import React, {useState, useCallback, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useThemeContext} from '../../theme/ThemeContext';
import {COLORS, FONTS, SPACING, RADIUS} from '../../theme/aaaTheme';
import GradientBackground from '../../components/GradientBackground';
import GlassCard from '../../components/GlassCard';
import {useSession} from '../../auth/sessionStore';
import {listWorkers} from '../../../sync/adminApi';

type Stats = {
  totalWorkers: number;
  activeWorkers: number;
  lastSync: number | null;
};

export default function AdminDashboardScreen() {
  const {t} = useTranslation();
  const {isAAA} = useThemeContext();
  const navigation = useNavigation<any>();
  const c = isAAA ? COLORS.aaa : COLORS.normal;
  const f = isAAA ? FONTS.aaa : FONTS.normal;

  const admin = useSession(s => s.admin);
  const [stats, setStats] = useState<Stats>({totalWorkers: 0, activeWorkers: 0, lastSync: null});
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const workers = await listWorkers();
      setStats({
        totalWorkers: workers.length,
        activeWorkers: workers.filter(w => w.active).length,
        lastSync: Date.now(),
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <GradientBackground variant="nhai">
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                refresh();
              }}
              tintColor="#FFF"
            />
          }>
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, {color: 'rgba(255,255,255,0.85)', fontSize: f.body}]}>
                {t('admin_dash.hello', 'Hello')},
              </Text>
              <Text style={[styles.adminName, {color: '#FFF', fontSize: f.titleLg}]}>
                {admin?.name || 'Admin'}
              </Text>
            </View>
            <Text style={styles.avatar}>🛡️</Text>
          </View>

          {error && (
            <Text style={[styles.errorText, {fontSize: f.body}]}>{error}</Text>
          )}

          <View style={styles.statsRow}>
            <StatCard
              label={t('admin_dash.total_workers', 'Workers')}
              value={String(stats.totalWorkers)}
              emoji="👷"
              c={c}
              f={f}
            />
            <StatCard
              label={t('admin_dash.active', 'Active')}
              value={String(stats.activeWorkers)}
              emoji="✓"
              c={c}
              f={f}
            />
          </View>

          <GlassCard intensity="high" style={styles.bigCard}>
            <Text style={[styles.sectionTitle, {color: '#FFF', fontSize: f.title}]}>
              {t('admin_dash.quick_actions', 'Quick Actions')}
            </Text>
            <View style={styles.actionsGrid}>
              <ActionBtn
                emoji="➕"
                label={t('admin_dash.add_worker', 'Add Worker')}
                onPress={() => navigation.navigate('AddWorker')}
                f={f}
              />
              <ActionBtn
                emoji="👥"
                label={t('admin_dash.view_workers', 'View Workers')}
                onPress={() => navigation.navigate('Workers')}
                f={f}
              />
              <ActionBtn
                emoji="📅"
                label={t('admin_dash.attendance', 'Attendance')}
                onPress={() => navigation.navigate('Calendar')}
                f={f}
              />
              <ActionBtn
                emoji="⚙️"
                label={t('admin_dash.settings', 'Settings')}
                onPress={() => navigation.navigate('Settings')}
                f={f}
              />
            </View>
          </GlassCard>

          <GlassCard style={styles.infoCard}>
            <Text style={[styles.infoLabel, {color: 'rgba(255,255,255,0.7)', fontSize: f.caption}]}>
              {t('admin_dash.system_status', 'System Status')}
            </Text>
            <Text style={[styles.infoValue, {color: '#10B981', fontSize: f.body}]}>
              ✓ {t('admin_dash.online', 'Online & syncing')}
            </Text>
            {stats.lastSync && (
              <Text style={[styles.infoLabel, {color: 'rgba(255,255,255,0.7)', fontSize: f.caption}]}>
                {t('admin_dash.last_refresh', 'Last refresh')}: {new Date(stats.lastSync).toLocaleTimeString()}
              </Text>
            )}
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function StatCard({label, value, emoji, c, f}: {label: string; value: string; emoji: string; c: any; f: any}) {
  return (
    <GlassCard intensity="med" style={styles.statCard}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, {color: '#FFF', fontSize: f.titleLg}]}>{value}</Text>
      <Text style={[styles.statLabel, {color: 'rgba(255,255,255,0.75)', fontSize: f.caption}]}>
        {label}
      </Text>
    </GlassCard>
  );
}

function ActionBtn({emoji, label, onPress, f}: {emoji: string; label: string; onPress: () => void; f: any}) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <Text style={[styles.actionLabel, {color: '#FFF', fontSize: f.body}]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  scroll: {padding: SPACING.lg, gap: SPACING.lg},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  greeting: {},
  adminName: {fontWeight: '800'},
  avatar: {fontSize: 48},
  statsRow: {flexDirection: 'row', gap: SPACING.md},
  statCard: {flex: 1, padding: SPACING.lg, alignItems: 'center'},
  statEmoji: {fontSize: 28, marginBottom: SPACING.xs},
  statValue: {fontWeight: '900'},
  statLabel: {marginTop: 4},
  bigCard: {padding: SPACING.lg, gap: SPACING.md},
  sectionTitle: {fontWeight: '700'},
  actionsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md},
  actionBtn: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  actionEmoji: {fontSize: 32, marginBottom: SPACING.xs},
  actionLabel: {fontWeight: '600'},
  infoCard: {padding: SPACING.lg, gap: SPACING.xs},
  infoLabel: {},
  infoValue: {fontWeight: '700'},
  errorText: {color: '#FCA5A5', textAlign: 'center'},
});
