import React, {useState, useEffect, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  Switch,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {
  getAllTemplates,
  deleteTemplate,
} from '../../storage/db/templates.repo';
import type {Template} from '../../storage/vectorMatch';
import {reloadTemplates} from '../../ml/pipeline';
import {useThemeContext} from '../theme/ThemeContext';
import {COLORS} from '../theme/aaaTheme';

export default function AdminScreen() {
  const {t, i18n} = useTranslation();
  const navigation = useNavigation();
  const {isAAA, toggleTheme} = useThemeContext();
  const [templates, setTemplates] = useState<Template[]>([]);
  const c = isAAA ? COLORS.aaa : COLORS.normal;

  const refresh = useCallback(() => {
    setTemplates(getAllTemplates());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = useCallback(
    (id: string, name: string) => {
      Alert.alert(t('common.delete'), `${name}?`, [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            deleteTemplate(id);
            reloadTemplates();
            refresh();
          },
        },
      ]);
    },
    [t, refresh],
  );

  const handleDeleteAll = useCallback(() => {
    Alert.alert(t('admin.delete_all'), t('admin.delete_confirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          for (const tmpl of templates) {
            deleteTemplate(tmpl.id);
          }
          reloadTemplates();
          refresh();
        },
      },
    ]);
  }, [t, templates, refresh]);

  const toggleLang = useCallback(() => {
    const next = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(next);
  }, [i18n]);

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: c.bg}]}>
      <View style={styles.headerBand}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <Text style={[styles.backIconText, {color: c.text}]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, {color: c.text}, isAAA && styles.titleAAA]}>
          {t('admin.title')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Stats hero */}
        <View
          style={[
            styles.statsHero,
            {
              backgroundColor: c.surface,
              borderColor: c.accent,
              borderWidth: isAAA ? 2 : 1,
            },
          ]}>
          <Text style={[styles.statsHeroValue, {color: c.accent}]}>
            {templates.length}
          </Text>
          <Text style={[styles.statsHeroLabel, {color: c.textSecondary}]}>
            {t('admin.enrolled_count')}
          </Text>
        </View>

        {/* Settings cards */}
        <View style={styles.settingsRow}>
          <View style={[styles.settingCard, {backgroundColor: c.surface}]}>
            <Text style={[styles.settingLabel, {color: c.textSecondary}]}>
              {t('admin.language')}
            </Text>
            <TouchableOpacity
              onPress={toggleLang}
              style={[styles.langPill, {backgroundColor: c.primary}]}>
              <Text style={styles.langPillText}>
                {i18n.language === 'en' ? '🇬🇧 EN' : '🇮🇳 हि'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.settingCard, {backgroundColor: c.surface}]}>
            <Text style={[styles.settingLabel, {color: c.textSecondary}]}>
              {t('admin.outdoor_mode')}
            </Text>
            <Switch
              value={isAAA}
              onValueChange={toggleTheme}
              trackColor={{true: c.accent, false: '#475569'}}
              thumbColor={isAAA ? '#000' : '#F8FAFC'}
            />
          </View>
        </View>

        {/* Templates section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, {color: c.text}]}>
            Enrolled Workers
          </Text>
          {templates.length > 0 && (
            <TouchableOpacity onPress={handleDeleteAll}>
              <Text style={[styles.deleteAllLink, {color: c.danger}]}>
                Clear all
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {templates.length === 0 ? (
          <View style={[styles.emptyCard, {backgroundColor: c.surface}]}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={[styles.emptyText, {color: c.textSecondary}]}>
              {t('admin.no_templates')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={templates}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({item, index}) => (
              <View
                style={[
                  styles.templateRow,
                  {
                    backgroundColor: c.surface,
                    borderColor: c.border,
                    borderWidth: isAAA ? 2 : 1,
                  },
                ]}>
                <View style={[styles.avatar, {backgroundColor: c.primary}]}>
                  <Text style={styles.avatarText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.templateInfo}>
                  <Text style={[styles.templateName, {color: c.text}]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.templateId, {color: c.textMuted}]}>
                    ID: {item.userId}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.name)}
                  style={[styles.deleteBtn, {backgroundColor: c.danger}]}>
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  headerBand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  backIcon: {padding: 4},
  backIconText: {fontSize: 26, fontWeight: '300'},
  title: {fontSize: 24, fontWeight: '800', letterSpacing: 0.3},
  titleAAA: {fontSize: 30},
  scrollContent: {padding: 20, paddingTop: 4},
  statsHero: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  statsHeroValue: {fontSize: 48, fontWeight: '800', letterSpacing: -1},
  statsHeroLabel: {
    fontSize: 13,
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  settingsRow: {flexDirection: 'row', gap: 12, marginBottom: 24},
  settingCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'flex-start',
    gap: 10,
  },
  settingLabel: {fontSize: 12, fontWeight: '600', letterSpacing: 0.3},
  langPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  langPillText: {color: '#fff', fontSize: 13, fontWeight: '700'},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {fontSize: 16, fontWeight: '700', letterSpacing: 0.3},
  deleteAllLink: {fontSize: 13, fontWeight: '700'},
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {fontSize: 48},
  emptyText: {fontSize: 14, textAlign: 'center'},
  templateRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {color: '#fff', fontSize: 18, fontWeight: '800'},
  templateInfo: {flex: 1},
  templateName: {fontSize: 16, fontWeight: '700'},
  templateId: {fontSize: 11, marginTop: 2, fontFamily: 'monospace'},
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {color: '#fff', fontSize: 14, fontWeight: '800'},
});
