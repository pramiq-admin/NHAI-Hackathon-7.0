import 'dart:math';

import '../ml/thresholds.dart';
import '../models/template.dart';

/// Result of a successful vector match.
class MatchResult {
  final String userId;
  final String name;
  final double score;

  /// Alias for score — used by the pipeline as "similarity".
  double get similarity => score;

  MatchResult({
    required this.userId,
    required this.name,
    required this.score,
  });
}

/// In-memory vector matching engine for face templates.
class VectorMatch {
  List<FaceTemplate> _templates = [];

  void setTemplates(List<FaceTemplate> templates) {
    _templates = List.from(templates);
  }

  int getTemplateCount() => _templates.length;

  /// Compute cosine similarity between two L2-normalized vectors.
  static double cosineSimilarity(List<double> a, List<double> b) {
    if (a.length != b.length || a.isEmpty) return 0.0;

    double dotProduct = 0.0;
    double normA = 0.0;
    double normB = 0.0;

    for (int i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    final denominator = sqrt(normA) * sqrt(normB);
    if (denominator == 0.0) return 0.0;

    return dotProduct / denominator;
  }

  /// Find the best matching template for the given embedding.
  ///
  /// Uses adaptive thresholding: relaxed during cold-start (few templates),
  /// stricter once enough samples are enrolled.
  MatchResult? findBestMatch(
    List<double> embedding,
    double threshold, {
    Function? getUserThreshold,
  }) {
    if (_templates.isEmpty) return null;

    MatchResult? bestMatch;
    double bestScore = -1.0;

    for (final template in _templates) {
      final score = cosineSimilarity(embedding, template.embedding);
      final effectiveThreshold = getUserThreshold != null
          ? (getUserThreshold(template.userId) as double? ?? threshold)
          : threshold;

      if (score >= effectiveThreshold && score > bestScore) {
        bestScore = score;
        bestMatch = MatchResult(
          userId: template.userId,
          name: template.name,
          score: score,
        );
      }
    }

    return bestMatch;
  }

  /// Async wrapper for pipeline integration. Uses adaptive threshold.
  Future<MatchResult?> findMatch(List<double> embedding) async {
    final threshold = _templates.length < Thresholds.adaptiveMinSamples
        ? Thresholds.adaptiveColdStart
        : Thresholds.matchCosine;
    return findBestMatch(embedding, threshold);
  }
}
