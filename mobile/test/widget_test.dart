import 'package:flutter_test/flutter_test.dart';
import 'package:t2gcrm_mobile/main.dart';

void main() {
  testWidgets('App launches', (WidgetTester tester) async {
    await tester.pumpWidget(const T2GCrmApp());
    await tester.pump();
    // App should show loading indicator initially
    expect(find.byType(T2GCrmApp), findsOneWidget);
  });
}
