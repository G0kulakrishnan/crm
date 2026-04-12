import 'package:flutter/material.dart';

class StageBadge extends StatelessWidget {
  final String stage;
  final String wonStage;

  const StageBadge({
    super.key,
    required this.stage,
    this.wonStage = 'Won',
  });

  static Color getColor(String stage, [String wonStage = 'Won']) {
    if (stage == wonStage) return Colors.green;
    switch (stage) {
      case 'New Enquiry':
        return Colors.blue;
      case 'Enquiry Contacted':
        return Colors.teal;
      case 'Quotation Created':
      case 'Invoice Created':
        return Colors.grey;
      case 'Quotation Sent':
        return Colors.purple;
      case 'Invoice Sent':
        return Colors.indigo;
      case 'Budget Negotiation':
        return Colors.orange;
      case 'Advance Paid':
        return Colors.purple;
      case 'Won':
        return Colors.green;
      case 'Lost':
        return Colors.red;
      case 'DNP':
      case 'Not Interested':
        return Colors.red.shade300;
      case 'Interested':
        return Colors.green.shade400;
      case 'Call Back':
        return Colors.amber;
      default:
        return Colors.blueGrey;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (stage.isEmpty) return const SizedBox.shrink();
    final color = getColor(stage, wonStage);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        stage.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}
