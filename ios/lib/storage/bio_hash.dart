import 'dart:typed_data';
import 'dart:math';
import 'package:pointycastle/pointycastle.dart';

class BioHash {
  static List<List<double>> generateProjectionMatrix(String salt, int dim) {
    final seed = _saltToSeed(salt);
    final random = _seededRandom(seed);

    // Generate random matrix then orthonormalize via Gram-Schmidt
    List<List<double>> matrix = List.generate(
      dim,
      (_) => List.generate(dim, (_) => random.nextDouble() * 2 - 1),
    );

    // Gram-Schmidt orthonormalization
    for (int i = 0; i < dim; i++) {
      for (int j = 0; j < i; j++) {
        final dot = _dotProduct(matrix[i], matrix[j]);
        for (int k = 0; k < dim; k++) {
          matrix[i][k] -= dot * matrix[j][k];
        }
      }
      final norm = _vectorNorm(matrix[i]);
      if (norm > 0) {
        for (int k = 0; k < dim; k++) {
          matrix[i][k] /= norm;
        }
      }
    }

    return matrix;
  }

  static List<int> bioHash(List<double> embedding, String salt) {
    final dim = embedding.length;
    final projMatrix = generateProjectionMatrix(salt, dim);

    // Project and sign-quantize
    return List.generate(dim, (i) {
      double projection = 0.0;
      for (int j = 0; j < dim; j++) {
        projection += projMatrix[i][j] * embedding[j];
      }
      return projection >= 0 ? 1 : -1;
    });
  }

  static int hammingDistance(List<int> a, List<int> b) {
    if (a.length != b.length) return a.length;
    int distance = 0;
    for (int i = 0; i < a.length; i++) {
      if (a[i] != b[i]) distance++;
    }
    return distance;
  }

  static Uint8List _saltToSeed(String salt) {
    final digest = Digest('SHA-256');
    final saltBytes = Uint8List.fromList(salt.codeUnits);
    return digest.process(saltBytes);
  }

  static Random _seededRandom(Uint8List seed) {
    // Use first 8 bytes as int seed for deterministic generation
    int intSeed = 0;
    for (int i = 0; i < min(8, seed.length); i++) {
      intSeed = (intSeed << 8) | seed[i];
    }
    return Random(intSeed);
  }

  static double _dotProduct(List<double> a, List<double> b) {
    double result = 0.0;
    for (int i = 0; i < a.length; i++) {
      result += a[i] * b[i];
    }
    return result;
  }

  static double _vectorNorm(List<double> v) {
    double sum = 0.0;
    for (final val in v) {
      sum += val * val;
    }
    return sqrt(sum);
  }
}
