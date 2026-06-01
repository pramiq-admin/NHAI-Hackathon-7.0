import 'dart:math';

Future<T> withRetry<T>(
  Future<T> Function() fn, {
  int maxRetries = 5,
  Duration baseDelay = const Duration(milliseconds: 1000),
}) async {
  int attempt = 0;
  final random = Random();

  while (true) {
    try {
      return await fn();
    } catch (e) {
      attempt++;
      if (attempt >= maxRetries) rethrow;

      final exponentialDelay = baseDelay * pow(2, attempt - 1).toInt();
      final jitter = Duration(
        milliseconds: random.nextInt(exponentialDelay.inMilliseconds ~/ 2),
      );
      await Future.delayed(exponentialDelay + jitter);
    }
  }
}
