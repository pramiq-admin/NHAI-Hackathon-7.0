import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  static const normal = _NormalColors();
  static const aaa = _AAAColors();
}

abstract class AppColorScheme {
  Color get bg;
  Color get bgGradient;
  Color get surface;
  Color get surfaceLight;
  Color get primary;
  Color get primaryDark;
  Color get accent;
  Color get success;
  Color get successLight;
  Color get danger;
  Color get warning;
  Color get text;
  Color get textSecondary;
  Color get textMuted;
  Color get border;
  Color get overlay;
}

abstract class AppFontScheme {
  double get body;
  double get bodyLg;
  double get title;
  double get titleLg;
  double get action;
  double get actionLg;
  double get debug;
  double get caption;
}

class _NormalColors implements AppColorScheme {
  const _NormalColors();

  final Color bg = const Color(0xFF0F172A);
  final Color bgGradient = const Color(0xFF1E293B);
  final Color surface = const Color(0xFF1E3A8A);
  final Color surfaceLight = const Color(0xFF334155);
  final Color primary = const Color(0xFF3B82F6);
  final Color primaryDark = const Color(0xFF1E40AF);
  final Color accent = const Color(0xFFF59E0B);
  final Color success = const Color(0xFF10B981);
  final Color successLight = const Color(0xFF34D399);
  final Color danger = const Color(0xFFEF4444);
  final Color warning = const Color(0xFFF59E0B);
  final Color text = const Color(0xFFF8FAFC);
  final Color textSecondary = const Color(0xFF94A3B8);
  final Color textMuted = const Color(0xFF64748B);
  final Color border = const Color(0xFF334155);
  final Color overlay = const Color(0xD90F172A);
}

class _AAAColors implements AppColorScheme {
  const _AAAColors();

  final Color bg = const Color(0xFF000000);
  final Color bgGradient = const Color(0xFF0A0A0A);
  final Color surface = const Color(0xFF1A1A00);
  final Color surfaceLight = const Color(0xFF2A2A00);
  final Color primary = const Color(0xFFFFD700);
  final Color primaryDark = const Color(0xFFFFA500);
  final Color accent = const Color(0xFFFF6B00);
  final Color success = const Color(0xFF00FF66);
  final Color successLight = const Color(0xFF33FF99);
  final Color danger = const Color(0xFFFF3333);
  final Color warning = const Color(0xFFFFA500);
  final Color text = const Color(0xFFFFFFFF);
  final Color textSecondary = const Color(0xFFFFD700);
  final Color textMuted = const Color(0xFFFFA500);
  final Color border = const Color(0xFFFFD700);
  final Color overlay = const Color(0xEB000000);
}

class AppFontSizes {
  AppFontSizes._();

  static const normal = _NormalFontSizes();
  static const aaa = _AAAFontSizes();
}

class _NormalFontSizes implements AppFontScheme {
  const _NormalFontSizes();

  final double body = 14;
  final double bodyLg = 16;
  final double title = 22;
  final double titleLg = 28;
  final double action = 16;
  final double actionLg = 18;
  final double debug = 11;
  final double caption = 12;
}

class _AAAFontSizes implements AppFontScheme {
  const _AAAFontSizes();

  final double body = 18;
  final double bodyLg = 20;
  final double title = 30;
  final double titleLg = 36;
  final double action = 22;
  final double actionLg = 26;
  final double debug = 14;
  final double caption = 16;
}

class AppSpacing {
  AppSpacing._();

  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
}

class AppRadius {
  AppRadius._();

  static const double sm = 6;
  static const double md = 10;
  static const double lg = 16;
  static const double xl = 24;
  static const double pill = 999;
}
