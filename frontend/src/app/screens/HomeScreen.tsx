import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, StatusBar} from 'react-native';
import {useTranslation} from 'react-i18next';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/RootStack';
import {useThemeContext} from '../theme/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({navigation}: Props) {
  const {isAAA} = useThemeContext();
  const {t} = useTranslation();

  return (
    <View style={[styles.container, isAAA && styles.containerAAA]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.header}>
        <Text style={[styles.title, isAAA && styles.titleAAA]}>
          {t('home.title')}
        </Text>
        <Text style={[styles.subtitle, isAAA && styles.subtitleAAA]}>
          {t('home.subtitle')}
        </Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, isAAA && styles.btnAAA]}
          onPress={() => navigation.navigate('Verify')}>
          <Text style={[styles.btnText, isAAA && styles.btnTextAAA]}>
            {t('home.verify')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary, isAAA && styles.btnSecondaryAAA]}
          onPress={() => navigation.navigate('Enroll')}>
          <Text style={[styles.btnText, isAAA && styles.btnTextAAA]}>
            {t('home.enroll')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnOutline, isAAA && styles.btnOutlineAAA]}
          onPress={() => navigation.navigate('Admin')}>
          <Text style={[styles.btnTextOutline, isAAA && styles.btnTextOutlineAAA]}>
            {t('home.admin')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  containerAAA: {
    backgroundColor: '#000',
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  titleAAA: {
    fontSize: 36,
    color: '#ffdd00',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  subtitleAAA: {
    fontSize: 18,
    color: '#ffdd00',
  },
  buttons: {
    gap: 16,
  },
  btn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnAAA: {
    paddingVertical: 22,
    borderRadius: 16,
  },
  btnPrimary: {
    backgroundColor: '#0096ff',
  },
  btnSecondary: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#0096ff',
  },
  btnSecondaryAAA: {
    backgroundColor: '#1a1a00',
    borderWidth: 2,
    borderColor: '#ffdd00',
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#444',
  },
  btnOutlineAAA: {
    borderWidth: 2,
    borderColor: '#ffdd00',
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  btnTextAAA: {
    fontSize: 24,
    fontWeight: '700',
  },
  btnTextOutline: {
    color: '#aaa',
    fontSize: 16,
  },
  btnTextOutlineAAA: {
    color: '#ffdd00',
    fontSize: 20,
  },
});
