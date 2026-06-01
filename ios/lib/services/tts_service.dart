import 'package:flutter_tts/flutter_tts.dart';

class TtsService {
  final FlutterTts _tts = FlutterTts();
  String _currentLocale = 'en-US';

  TtsService() {
    _tts.setSpeechRate(0.5);
    _tts.setVolume(1.0);
    _tts.setPitch(1.0);
  }

  Future<void> setLocale(String languageCode) async {
    _currentLocale = languageCode == 'hi' ? 'hi-IN' : 'en-US';
    await _tts.setLanguage(_currentLocale);
  }

  Future<void> speak(String text, {bool flush = true}) async {
    if (flush) {
      await _tts.stop();
    }
    await _tts.speak(text);
  }

  Future<void> stop() async {
    await _tts.stop();
  }
}
