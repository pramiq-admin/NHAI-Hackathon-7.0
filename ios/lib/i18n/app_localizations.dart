import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class AppLocalizations {
  final Locale locale;
  late Map<String, dynamic> _strings;

  AppLocalizations(this.locale);

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static const supportedLocales = [
    Locale('en'),
    Locale('hi'),
  ];

  Future<void> load() async {
    final jsonString =
        await rootBundle.loadString('assets/i18n/${locale.languageCode}.json');
    _strings = json.decode(jsonString) as Map<String, dynamic>;
  }

  String t(String key, {Map<String, String>? params}) {
    final parts = key.split('.');
    dynamic value = _strings;

    for (final part in parts) {
      if (value is Map<String, dynamic> && value.containsKey(part)) {
        value = value[part];
      } else {
        return key;
      }
    }

    if (value is! String) return key;

    var result = value;
    if (params != null) {
      params.forEach((paramKey, paramValue) {
        result = result.replaceAll('{{$paramKey}}', paramValue);
      });
    }

    return result;
  }
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) {
    return ['en', 'hi'].contains(locale.languageCode);
  }

  @override
  Future<AppLocalizations> load(Locale locale) async {
    final localizations = AppLocalizations(locale);
    await localizations.load();
    return localizations;
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

/// Named delegate class that can accept a LocaleNotifier for reactivity.
/// Used by main.dart: AppLocalizationsDelegate(localeNotifier).
class AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  final LocaleNotifier? _localeNotifier;

  const AppLocalizationsDelegate([this._localeNotifier]);

  @override
  bool isSupported(Locale locale) {
    return ['en', 'hi'].contains(locale.languageCode);
  }

  @override
  Future<AppLocalizations> load(Locale locale) async {
    final localizations = AppLocalizations(locale);
    await localizations.load();
    return localizations;
  }

  @override
  bool shouldReload(AppLocalizationsDelegate old) => true;
}

class LocaleNotifier extends ChangeNotifier {
  Locale _locale = const Locale('en');

  Locale get locale => _locale;

  void setLocale(Locale locale) {
    if (_locale != locale) {
      _locale = locale;
      notifyListeners();
    }
  }

  void toggleLanguage() {
    _locale = _locale.languageCode == 'en'
        ? const Locale('hi')
        : const Locale('en');
    notifyListeners();
  }
}
