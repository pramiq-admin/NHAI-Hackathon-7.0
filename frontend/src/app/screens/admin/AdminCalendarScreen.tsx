import React, {useState, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {FONTS, SPACING} from '../../theme/aaaTheme';
import {useThemeContext} from '../../theme/ThemeContext';
import GradientBackground from '../../components/GradientBackground';
import GlassCard from '../../components/GlassCard';
import {listWorkers, type WorkerOut} from '../../../sync/adminApi';

export default function AdminCalendarScreen() {
  const {t} = useTranslation();
  const {isAAA} = useThemeContext();
  const navigation = useNavigation<any>();
  const f = isAAA ? FONTS.aaa : FONTS.normal;

  const [workers, setWorkers] = useState<WorkerOut[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setWorkers(await listWorkers());
    } catch {
      setWorkers([]);
    } finally {
      setLoading(false);
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
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.title, {color: '#FFF', fontSize: f.titleLg}]}>
            {t('admin_cal.title', 'Attendance')}
          </Text>
          <Text style={[styles.subtitle, {color: 'rgba(255,255,255,0.85)', fontSize: f.body}]}>
            {t('admin_cal.pick_worker', 'Pick a worker to view attendance')}
          </Text>

          {loading && <ActivityIndicator color="#FFF" style={{marginTop: SPACING.xl}} />}

          {!loading && workers.length === 0 && (
            <GlassCard style={styles.empty}>
              <Text style={[styles.emptyText, {color: '#FFF', fontSize: f.body}]}>
                {t('admin_cal.empty', 'No workers yet')}
              </Text>
            </GlassCard>
          )}

          <View style={styles.list}>
            {workers.map(w => (
              <GlassCard key={w.id} intensity="med" style={styles.row}>
                <TouchableOpacity
                  style={styles.rowInner}
                  onPress={() =>
                    navigation.navigate('AdminWorkerCalendar', {
                      workerId: w.id,
                      workerName: w.name,
                    })
                  }>
                  <Text style={styles.rowEmoji}>{w.active ? '👷' : '🚫'}</Text>
                  <View style={{flex: 1}}>
                    <Text style={[styles.rowName, {color: '#FFF', fontSize: f.bodyLg}]}>
                      {w.name}
                    </Text>
                    <Text style={[styles.rowMeta, {color: 'rgba(255,255,255,0.75)', fontSize: f.caption}]}>
                      {w.aadhar_masked}
                    </Text>
                  </View>
                  <Text style={[styles.rowArrow, {color: '#FFF'}]}>›</Text>
                </TouchableOpacity>
              </GlassCard>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  scroll: {padding: SPACING.lg, paddingBottom: SPACING.xxl},
  title: {fontWeight: '800'},
  subtitle: {marginTop: SPACING.xs, marginBottom: SPACING.lg},
  empty: {padding: SPACING.lg, alignItems: 'center'},
  emptyText: {textAlign: 'center'},
  list: {gap: SPACING.md},
  row: {},
  rowInner: {flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md},
  rowEmoji: {fontSize: 32},
  rowName: {fontWeight: '700'},
  rowMeta: {marginTop: 2},
  rowArrow: {fontSize: 28, fontWeight: '300'},
});
