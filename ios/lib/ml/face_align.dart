import 'dart:math';
import 'dart:typed_data';
import 'dart:ui' show Offset;

import 'package:image/image.dart' as img;

/// Standard 112x112 destination landmarks for face alignment.
/// Based on ArcFace reference alignment coordinates.
const List<Offset> _referencePoints112 = [
  Offset(38.2946, 51.6963), // left eye
  Offset(73.5318, 51.5014), // right eye
  Offset(56.0252, 71.7366), // nose tip
  Offset(41.5493, 92.3655), // left mouth
  Offset(70.7299, 92.2041), // right mouth
];

/// Align a face crop to a canonical 112x112 pose using a similarity transform.
///
/// [imageBytes] — raw image bytes (any format decodable by the `image` package).
/// [landmarks] — exactly 5 facial landmarks in order:
///   left eye, right eye, nose, left mouth corner, right mouth corner.
///
/// Returns a 112*112*3 flat RGB [Uint8List] suitable for embedding extraction.
Uint8List alignFace(Uint8List imageBytes, List<Offset> landmarks) {
  assert(landmarks.length == 5, 'Exactly 5 landmarks required');

  final srcImage = img.decodeImage(imageBytes);
  if (srcImage == null) {
    throw ArgumentError('Unable to decode image bytes');
  }

  // Compute similarity transform from source landmarks to reference.
  final transform = _estimateSimilarityTransform(landmarks, _referencePoints112);

  // Apply transform to produce 112x112 output.
  final output = img.Image(width: 112, height: 112);

  for (int y = 0; y < 112; y++) {
    for (int x = 0; x < 112; x++) {
      // Inverse transform: map output (x,y) back to source coordinates.
      final srcX = transform.a * x + transform.b * y + transform.tx;
      final srcY = -transform.b * x + transform.a * y + transform.ty;

      final pixel = _bilinearSample(srcImage, srcX, srcY);
      output.setPixelRgb(x, y, pixel.$1, pixel.$2, pixel.$3);
    }
  }

  // Convert to flat RGB byte array.
  final result = Uint8List(112 * 112 * 3);
  int idx = 0;
  for (int y = 0; y < 112; y++) {
    for (int x = 0; x < 112; x++) {
      final p = output.getPixel(x, y);
      result[idx++] = p.r.toInt();
      result[idx++] = p.g.toInt();
      result[idx++] = p.b.toInt();
    }
  }

  return result;
}

/// Overload that accepts a decoded image and bounding box for convenience.
/// [bbox] uses the FaceRect record type from face_detector_service.
Uint8List alignFaceFromImage(
  img.Image fullImage,
  ({double left, double top, double width, double height}) bbox,
  List<Offset> landmarks,
) {
  // Crop around the bounding box with some margin.
  final cropLeft = max(0, bbox.left.toInt() - 10);
  final cropTop = max(0, bbox.top.toInt() - 10);
  final cropWidth = min(fullImage.width - cropLeft, bbox.width.toInt() + 20);
  final cropHeight = min(fullImage.height - cropTop, bbox.height.toInt() + 20);

  final cropped = img.copyCrop(
    fullImage,
    x: cropLeft,
    y: cropTop,
    width: cropWidth,
    height: cropHeight,
  );

  // Adjust landmarks relative to crop origin.
  final adjustedLandmarks = landmarks
      .map((l) => Offset(l.dx - cropLeft, l.dy - cropTop))
      .toList();

  final encoded = Uint8List.fromList(img.encodePng(cropped));
  return alignFace(encoded, adjustedLandmarks);
}

/// Similarity transform parameters: scale+rotation (a, b) + translation (tx, ty).
/// Mapping: x' = a*x + b*y + tx, y' = -b*x + a*y + ty
class _SimilarityTransform {
  final double a;
  final double b;
  final double tx;
  final double ty;

  const _SimilarityTransform(this.a, this.b, this.tx, this.ty);
}

/// Estimate the inverse similarity transform from destination to source landmarks
/// using least squares.
_SimilarityTransform _estimateSimilarityTransform(
  List<Offset> src,
  List<Offset> dst,
) {
  // We want: for each point, dst = T * src
  // But we need the inverse (src from dst) for sampling.
  // So compute forward transform dst->src (i.e., swap src and dst).
  // Actually, we want to sample: for output pixel (dx, dy), find source (sx, sy).
  // That means we need the inverse of (src -> dst), which is (dst -> src).

  final n = src.length;
  // Solve: src_i = a * dst_i.x + b * dst_i.y + tx
  //                 -b * dst_i.x + a * dst_i.y + ty

  // Using least squares: minimize sum of squared residuals.
  double sumDx2 = 0, sumDy2 = 0, sumDxDy = 0;
  double sumDx = 0, sumDy = 0;
  double sumSxDx = 0, sumSxDy = 0, sumSx = 0;
  double sumSyDx = 0, sumSyDy = 0, sumSy = 0;

  for (int i = 0; i < n; i++) {
    final dx = dst[i].dx;
    final dy = dst[i].dy;
    final sx = src[i].dx;
    final sy = src[i].dy;

    sumDx2 += dx * dx + dy * dy;
    sumDx += dx;
    sumDy += dy;
    sumSxDx += sx * dx + sy * dy;
    sumSxDy += sx * dy - sy * dx;
    sumSx += sx;
    sumSy += sy;
  }

  // System of equations (4 unknowns: a, b, tx, ty):
  // [sumDx2,  0,     sumDx, sumDy ] [a ]   [sumSxDx]
  // [0,       sumDx2, -sumDy, sumDx] [b ] = [sumSxDy]  (not quite, simplified below)
  // Actually, the standard form for similarity transform least squares:
  // a = (sum(sx*dx + sy*dy)) / sum(dx^2 + dy^2)  (centered)
  // For simplicity, use the analytic solution with centroid subtraction.

  final cSrcX = sumSx / n;
  final cSrcY = sumSy / n;
  final cDstX = sumDx / n;
  final cDstY = sumDy / n;

  double num1 = 0, num2 = 0, denom = 0;
  for (int i = 0; i < n; i++) {
    final dxC = dst[i].dx - cDstX;
    final dyC = dst[i].dy - cDstY;
    final sxC = src[i].dx - cSrcX;
    final syC = src[i].dy - cSrcY;

    num1 += sxC * dxC + syC * dyC;
    num2 += sxC * dyC - syC * dxC;
    denom += dxC * dxC + dyC * dyC;
  }

  if (denom < 1e-10) {
    return const _SimilarityTransform(1.0, 0.0, 0.0, 0.0);
  }

  final a = num1 / denom;
  final b = num2 / denom;
  final tx = cSrcX - a * cDstX - b * cDstY;
  final ty = cSrcY + b * cDstX - a * cDstY;

  return _SimilarityTransform(a, b, tx, ty);
}

/// Bilinear sampling from source image at fractional coordinates.
(int, int, int) _bilinearSample(img.Image image, double x, double y) {
  final x0 = x.floor();
  final y0 = y.floor();
  final x1 = x0 + 1;
  final y1 = y0 + 1;

  final fx = x - x0;
  final fy = y - y0;

  final p00 = _getPixelSafe(image, x0, y0);
  final p01 = _getPixelSafe(image, x1, y0);
  final p10 = _getPixelSafe(image, x0, y1);
  final p11 = _getPixelSafe(image, x1, y1);

  final r = ((1 - fx) * (1 - fy) * p00.$1 +
          fx * (1 - fy) * p01.$1 +
          (1 - fx) * fy * p10.$1 +
          fx * fy * p11.$1)
      .round()
      .clamp(0, 255);
  final g = ((1 - fx) * (1 - fy) * p00.$2 +
          fx * (1 - fy) * p01.$2 +
          (1 - fx) * fy * p10.$2 +
          fx * fy * p11.$2)
      .round()
      .clamp(0, 255);
  final b = ((1 - fx) * (1 - fy) * p00.$3 +
          fx * (1 - fy) * p01.$3 +
          (1 - fx) * fy * p10.$3 +
          fx * fy * p11.$3)
      .round()
      .clamp(0, 255);

  return (r, g, b);
}

(int, int, int) _getPixelSafe(img.Image image, int x, int y) {
  final cx = x.clamp(0, image.width - 1);
  final cy = y.clamp(0, image.height - 1);
  final p = image.getPixel(cx, cy);
  return (p.r.toInt(), p.g.toInt(), p.b.toInt());
}
