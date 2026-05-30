import React from 'react';
import {StyleSheet, Text, View, TouchableOpacity, SafeAreaView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useThemeContext} from '../../theme/ThemeContext';
import {COLORS, FONTS, SPACING, RADIUS} from '../../theme/aaaTheme';
import GradientBackground from '../../components/GradientBackground';
import GlassCard from '../../components/GlassCard';

export default function AdminAuthScreen() {
  const {t} = useTranslation();
  const {isAAA} = useThemeContext();
  const navigation = useNavigation<any>();
  const c = isAAA ? COLORS.aaa : COLORS.normal;
  const f = isAAA ? FONTS.aaa : FONTS.normal;

  return (
    <GradientBackground variant="nhai">
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, {color: '#FFF', fontSize: f.body}]}>‹ {t('common.back')}</Text>
        </TouchableOpacity>

        <View style={styles.center}>
          <Text style={[styles.title, {color: '#FFF', fontSize: f.titleLg}]}>
            {t('admin_auth.title', 'Admin Access')}
          </Text>
          <Text style={[styles.subtitle, {color: 'rgba(255,255,255,0.8)', fontSize: f.body}]}>
            {t('admin_auth.subtitle', 'Login if you already have an account, or signup as a new admin')}
          </Text>

          <View style={styles.cards}>
            <GlassCard intensity="high" style={styles.card}>
              <TouchableOpacity
                style={styles.cardInner}
                onPress={() => navigation.navigate('AdminLogin')}>
                <Text style={styles.emoji}>🔑</Text>
                <Text style={[styles.cardTitle, {color: '#FFF', fontSize: f.title}]}>
                  {t('admin_auth.login', 'Login as Admin')}
                </Text>
                <Text style={[styles.cardSub, {color: 'rgba(255,255,255,0.75)', fontSize: f.body}]}>
                  {t('admin_auth.login_hint', 'Mobile + face verification')}
                </Text>
              </TouchableOpacity>
            </GlassCard>

            <GlassCard intensity="high" style={styles.card}>
              <TouchableOpacity
                style={styles.cardInner}
                onPress={() => navigation.navigate('AdminSignup')}>
                <Text style={styles.emoji}>✨</Text>
                <Text style={[styles.cardTitle, {color: '#FFF', fontSize: f.title}]}>
                  {t('admin_auth.signup', 'Signup as Admin')}
                </Text>
                <Text style={[styles.cardSub, {color: 'rgba(255,255,255,0.75)', fontSize: f.body}]}>
                  {t('admin_auth.signup_hint', 'Name, mobile, Aadhar, face')}
                </Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, paddingHorizontal: SPACING.lg},
  backBtn: {paddingVertical: SPACING.md},
  backText: {fontWeight: '600'},
  center: {flex: 1, justifyContent: 'center'},
  title: {fontWeight: '800', textAlign: 'center'},
  subtitle: {textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.xl, paddingHorizontal: SPACING.md},
  cards: {gap: SPACING.lg},
  card: {minHeight: 140},
  cardInner: {padding: SPACING.lg, alignItems: 'center', gap: SPACING.sm},
  emoji: {fontSize: 48},
  cardTitle: {fontWeight: '700', textAlign: 'center'},
  cardSub: {textAlign: 'center'},
});
