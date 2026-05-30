import React, {useState, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useThemeContext} from '../../theme/ThemeContext';
import {COLORS, FONTS, SPACING, RADIUS} from '../../theme/aaaTheme';
import {listWorkers, deleteWorker, type WorkerOut} from '../../../sync/adminApi';
import {deleteTemplatesForName} from '../../../storage/db/templates.repo';
import {reloadTemplates} from '../../../ml/pipeline';

export default function WorkersListScreen() {
  const {t} = useTranslation();
  const {isAAA} = useThemeContext();
  const navigation = useNavigation<any>();
  const c = isAAA ? COLORS.aaa : COLORS.normal;
  const f = isAAA ? FONTS.aaa : FONTS.normal;

  const [workers, setWorkers] = useState<WorkerOut[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listWorkers();
      setWorkers(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load workers');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDelete = (w: WorkerOut) => {
    Alert.alert(
      t('workers_list.delete_title', 'Deactivate Worker'),
      t('workers_list.delete_msg', {
        name: w.name,
        defaultValue: `Deactivate ${w.name}? They will no longer be able to log in.`,
      }),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('workers_list.delete_btn', 'Deactivate'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorker(w.id);
              // S24: biometric data must not linger on the device after
              // deactivation. Wipe the local face template and refresh the
              // in-memory match cache so subsequent punches can't recognise
              // them.
              try {
                deleteTemplatesForName(w.name);
                reloadTemplates();
              } catch {}
              load();
            } catch (e: any) {
              Alert.alert(t('common.error'), e?.message || 'Delete failed');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: c.bg}]}>
      <View style={[styles.header, {borderColor: c.border}]}>
        <Text style={[styles.title, {color: c.text, fontSize: f.titleLg}]}>
          {t('workers_list.title', 'Workers')}
        </Text>
        <Text style={[styles.subtitle, {color: c.textSecondary, fontSize: f.body}]}>
          {workers.length} {t('workers_list.count_suffix', 'registered')}
        </Text>
      </View>

      {error && <Text style={[styles.errorText, {fontSize: f.body}]}>{error}</Text>}

      <FlatList
        data={workers}
        keyExtractor={w => w.id}
        contentContainerStyle={{padding: SPACING.lg, paddingBottom: 120}}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={c.primary}
          />
        }
        renderItem={({item}) => (
          <View
            style={[
              styles.row,
              {
                backgroundColor: c.surface,
                borderColor: c.border,
                opacity: item.active ? 1 : 0.5,
              },
            ]}>
            <Text style={styles.rowEmoji}>{item.active ? '👷' : '🚫'}</Text>
            <View style={styles.rowMain}>
              <Text style={[styles.rowName, {color: c.text, fontSize: f.bodyLg}]}>
                {item.name}
              </Text>
              <Text style={[styles.rowMeta, {color: c.textSecondary, fontSize: f.caption}]}>
                {item.aadhar_masked}
              </Text>
            </View>
            <View style={styles.rowActions}>
              <TouchableOpacity
                style={[styles.iconBtn, {borderColor: c.primary}]}
                onPress={() =>
                  navigation.navigate('AdminWorkerCalendar', {
                    workerId: item.id,
                    workerName: item.name,
                  })
                }>
                <Text style={{fontSize: 18}}>📅</Text>
              </TouchableOpacity>
              {item.active && (
                <TouchableOpacity
                  style={[styles.iconBtn, {borderColor: c.danger}]}
                  onPress={() => handleDelete(item)}>
                  <Text style={{fontSize: 18}}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👷‍♂️</Text>
            <Text style={[styles.emptyTitle, {color: c.text, fontSize: f.title}]}>
              {t('workers_list.empty_title', 'No workers yet')}
            </Text>
            <Text style={[styles.emptySub, {color: c.textSecondary, fontSize: f.body}]}>
              {t('workers_list.empty_sub', 'Add your first worker to get started')}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, {backgroundColor: c.primary}]}
        onPress={() => navigation.navigate('AddWorker')}>
        <Text style={[styles.fabText, {color: isAAA ? '#000' : '#FFF'}]}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1},
  header: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
  },
  title: {fontWeight: '800'},
  subtitle: {marginTop: 2},
  errorText: {color: '#FCA5A5', textAlign: 'center', padding: SPACING.md},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  rowEmoji: {fontSize: 32},
  rowMain: {flex: 1},
  rowName: {fontWeight: '700'},
  rowMeta: {marginTop: 2},
  rowActions: {flexDirection: 'row', gap: SPACING.sm},
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {alignItems: 'center', padding: SPACING.xxl, gap: SPACING.sm},
  emptyEmoji: {fontSize: 80, marginBottom: SPACING.md},
  emptyTitle: {fontWeight: '700'},
  emptySub: {textAlign: 'center'},
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
  },
  fabText: {fontSize: 32, fontWeight: '700', lineHeight: 36},
});
