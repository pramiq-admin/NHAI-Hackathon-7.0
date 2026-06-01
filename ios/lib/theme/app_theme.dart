import 'package:flutter/material.dart';
import 'colors.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get normal => _buildTheme(isAAA: false);
  static ThemeData get aaa => _buildTheme(isAAA: true);

  // Aliases used by main.dart
  static ThemeData get normalTheme => normal;
  static ThemeData get aaaTheme => aaa;

  static ThemeData _buildTheme({required bool isAAA}) {
    final colors = isAAA ? AppColors.aaa : AppColors.normal;
    final fonts = isAAA ? AppFontSizes.aaa : AppFontSizes.normal;

    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: colors.bg,
      primaryColor: colors.primary,
      colorScheme: ColorScheme.dark(
        primary: colors.primary,
        secondary: colors.accent,
        surface: colors.surface,
        error: colors.danger,
        onPrimary: isAAA ? Colors.black : Colors.white,
        onSecondary: Colors.black,
        onSurface: colors.text,
        onError: Colors.white,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: colors.bg,
        foregroundColor: colors.text,
        elevation: 0,
        titleTextStyle: TextStyle(
          color: colors.text,
          fontSize: fonts.title,
          fontWeight: FontWeight.w700,
        ),
      ),
      cardTheme: CardThemeData(
        color: colors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          side: BorderSide(
            color: colors.border,
            width: isAAA ? 2 : 1,
          ),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colors.primary,
          foregroundColor: isAAA ? Colors.black : Colors.white,
          padding: EdgeInsets.symmetric(
            vertical: isAAA ? 18 : 14,
            horizontal: isAAA ? 32 : 24,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(isAAA ? 16 : 12),
          ),
          textStyle: TextStyle(
            fontSize: fonts.action,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: colors.primary,
          textStyle: TextStyle(
            fontSize: fonts.action,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.bg,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: colors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: colors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: colors.primary, width: 2),
        ),
        labelStyle: TextStyle(color: colors.textSecondary, fontSize: fonts.body),
        hintStyle: TextStyle(color: colors.textMuted, fontSize: fonts.body),
      ),
      textTheme: TextTheme(
        headlineLarge: TextStyle(
          color: colors.text,
          fontSize: fonts.titleLg,
          fontWeight: FontWeight.w700,
        ),
        headlineMedium: TextStyle(
          color: colors.text,
          fontSize: fonts.title,
          fontWeight: FontWeight.w700,
        ),
        bodyLarge: TextStyle(
          color: colors.text,
          fontSize: fonts.bodyLg,
        ),
        bodyMedium: TextStyle(
          color: colors.text,
          fontSize: fonts.body,
        ),
        bodySmall: TextStyle(
          color: colors.textSecondary,
          fontSize: fonts.caption,
        ),
        labelLarge: TextStyle(
          color: colors.text,
          fontSize: fonts.action,
          fontWeight: FontWeight.w700,
        ),
      ),
      dividerColor: colors.border,
      iconTheme: IconThemeData(color: colors.text),
    );
  }
}

class ThemeNotifier extends ChangeNotifier {
  bool _isAAA = false;

  bool get isAAA => _isAAA;

  ThemeData get theme => _isAAA ? AppTheme.aaa : AppTheme.normal;

  void toggleAAA() {
    _isAAA = !_isAAA;
    notifyListeners();
  }

  void setAAA(bool value) {
    if (_isAAA != value) {
      _isAAA = value;
      notifyListeners();
    }
  }
}
