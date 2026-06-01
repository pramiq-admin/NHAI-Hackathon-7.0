// Basic Flutter widget test for NHAI Face Auth app.

import 'package:flutter_test/flutter_test.dart';

import 'package:nhai_face_auth/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const NhaiFaceAuthApp());

    // Just verify the app builds without crashing.
    expect(find.byType(NhaiFaceAuthApp), findsOneWidget);
  });
}
