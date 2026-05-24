import React, {useState, useEffect, useCallback} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Alert,
  Switch,
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

export default function AdminScreen() {
  const {t, i18n} = useTranslation();
  const navigation = useNavigation();
  const {isAAA, toggleTheme} = useThemeContext();
  const [templates, setTemplates] = useState<Template[]>([]);

  const refresh = useCallback(() => {
    const data = getAllTemplates();
    setTemplates(data);
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
    <View style={[styles.container, isAAA && styles.containerAAA]}>
      <Text style={[styles.title, isAAA && styles.titleAAA]}>
        {t('admin.title')}
      </Text>

      {/* Stats */}
      <View style={[styles.card, isAAA && styles.cardAAA]}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, isAAA && styles.textAAA]}>
            {t('admin.enrolled_count')}
          </Text>
          <Text style={[styles.statValue, isAAA && styles.textAAA]}>
            {templates.length}
          </Text>
        </View>
      </View>

      {/* Language toggle */}
      <View style={[styles.card, isAAA && styles.cardAAA]}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, isAAA && styles.textAAA]}>
            {t('admin.language')}
          </Text>
          <TouchableOpacity onPress={toggleLang} style={styles.langBtn}>
            <Text style={styles.langBtnText}>
              {i18n.language === 'en' ? 'EN' : 'HI'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AAA Outdoor Mode */}
      <View style={[styles.card, isAAA && styles.cardAAA]}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, isAAA && styles.textAAA]}>
            {t('admin.outdoor_mode')}
          </Text>
          <Switch
            value={isAAA}
            onValueChange={toggleTheme}
            trackColor={{true: '#ffdd00', false: '#333'}}
            thumbColor={isAAA ? '#000' : '#fff'}
          />
        </View>
      </View>

      {/* Template list */}
      <FlatList
        data={templates}
        keyExtractor={item => item.id}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>{t('admin.no_templates')}</Text>
        }
        renderItem={({item}) => (
          <View style={[styles.templateRow, isAAA && styles.templateRowAAA]}>
            <View style={styles.templateInfo}>
              <Text style={[styles.templateName, isAAA && styles.textAAA]}>
                {item.name}
              </Text>
              <Text style={styles.templateId}>{item.userId}</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(item.id, item.name)}
              style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Delete all */}
      {templates.length > 0 && (
        <TouchableOpacity style={styles.deleteAllBtn} onPress={handleDeleteAll}>
          <Text style={styles.deleteAllText}>{t('admin.delete_all')}</Text>
        </TouchableOpacity>
      )}

      {/* Back */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>{t('common.back')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    padding: 20,
  },
  containerAAA: {
    backgroundColor: '#000',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    marginTop: 40,
  },
  titleAAA: {
    fontSize: 32,
    color: '#ffdd00',
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardAAA: {
    borderWidth: 2,
    borderColor: '#ffdd00',
    backgroundColor: '#1a1a00',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  textAAA: {
    color: '#ffdd00',
    fontSize: 18,
  },
  langBtn: {
    backgroundColor: '#0096ff',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  langBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    flex: 1,
    marginTop: 8,
  },
  empty: {
    color: '#666',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
  },
  templateRow: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  templateRowAAA: {
    borderWidth: 2,
    borderColor: '#ffdd00',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  templateId: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  deleteBtn: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteAllBtn: {
    backgroundColor: '#ff4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  deleteAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtnText: {
    color: '#aaa',
    fontSize: 16,
  },
});
