import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';
import '../../models/lead.dart';
import '../../providers/auth_provider.dart';
import '../../providers/config_provider.dart';
import '../../providers/lead_provider.dart';
import '../../widgets/stage_badge.dart';
import 'lead_form_screen.dart';

class LeadDetailScreen extends StatelessWidget {
  final Lead lead;

  const LeadDetailScreen({super.key, required this.lead});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final config = context.watch<ConfigProvider>();
    final leadProv = context.watch<LeadProvider>();
    final session = auth.session!;
    final canEdit = session.can('Leads', 'edit');
    final canDelete = session.can('Leads', 'delete');

    // Find the latest version from provider
    final currentLead = leadProv.allLeads.firstWhere(
      (l) => l.id == lead.id,
      orElse: () => lead,
    );

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text('Lead Details',
            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0.5,
        actions: [
          if (canEdit)
            IconButton(
              icon: const Icon(Icons.edit_outlined, size: 20),
              onPressed: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => LeadFormScreen(lead: currentLead),
                  ),
                );
                if (result == true && context.mounted) {
                  Navigator.pop(context);
                }
              },
            ),
          if (canDelete)
            IconButton(
              icon: const Icon(Icons.delete_outline, size: 20, color: Colors.red),
              onPressed: () => _confirmDelete(context, leadProv, session.ownerUserId),
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: StageBadge.getColor(
                          currentLead.stage, config.wonStage)
                      .withValues(alpha: 0.15),
                  child: Text(
                    currentLead.name.isNotEmpty
                        ? currentLead.name[0].toUpperCase()
                        : '?',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 22,
                      color: StageBadge.getColor(
                          currentLead.stage, config.wonStage),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  currentLead.name,
                  style: const TextStyle(
                      fontSize: 20, fontWeight: FontWeight.w800),
                ),
                if (currentLead.companyName.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(currentLead.companyName,
                      style: TextStyle(
                          fontSize: 14, color: Colors.grey.shade600)),
                ],
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  children: [
                    StageBadge(
                        stage: currentLead.stage,
                        wonStage: config.wonStage),
                    if (currentLead.requirement.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.deepPurple.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          currentLead.requirement.toUpperCase(),
                          style: TextStyle(
                            color: Colors.deepPurple.shade700,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Action buttons
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                if (currentLead.hasPhone)
                  _actionButton(Icons.phone, 'Call', Colors.green, () async {
                    final uri = Uri.parse('tel:${currentLead.phone}');
                    if (await canLaunchUrl(uri)) await launchUrl(uri);
                  }),
                if (currentLead.hasPhone)
                  _actionButton(
                      Icons.message, 'WhatsApp', const Color(0xFF25D366),
                      () async {
                    final uri = Uri.parse(
                        'https://wa.me/${currentLead.waPhone}');
                    if (await canLaunchUrl(uri)) {
                      await launchUrl(uri,
                          mode: LaunchMode.externalApplication);
                    }
                  }),
                if (currentLead.hasEmail)
                  _actionButton(Icons.email_outlined, 'Email', Colors.blue,
                      () async {
                    final uri = Uri.parse('mailto:${currentLead.email}');
                    if (await canLaunchUrl(uri)) await launchUrl(uri);
                  }),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Details
          _detailsCard([
            if (currentLead.phone.isNotEmpty)
              _detailRow(Icons.phone_outlined, 'Phone', currentLead.phone),
            if (currentLead.email.isNotEmpty)
              _detailRow(Icons.email_outlined, 'Email', currentLead.email),
            _detailRow(Icons.source_outlined, 'Source', currentLead.source),
            _detailRow(Icons.flag_outlined, 'Stage', currentLead.stage),
            if (currentLead.assign.isNotEmpty)
              _detailRow(
                  Icons.person_outline, 'Assigned To', currentLead.assign),
            if (currentLead.followup.isNotEmpty)
              _detailRow(Icons.alarm, 'Follow-up', currentLead.followup),
            if (currentLead.requirement.isNotEmpty)
              _detailRow(Icons.thermostat_outlined, 'Requirement',
                  currentLead.requirement),
            if (currentLead.productCat.isNotEmpty)
              _detailRow(Icons.category_outlined, 'Product Category',
                  currentLead.productCat),
            if (currentLead.createdDate != null)
              _detailRow(Icons.calendar_today, 'Created',
                  DateFormat('dd MMM yyyy, hh:mm a').format(currentLead.createdDate!)),
          ]),

          // Notes
          if (currentLead.notes.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Notes',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Colors.grey.shade500)),
                  const SizedBox(height: 8),
                  Text(currentLead.notes,
                      style: const TextStyle(fontSize: 14, height: 1.5)),
                ],
              ),
            ),
          ],

          // Custom fields
          if (currentLead.custom.isNotEmpty) ...[
            const SizedBox(height: 12),
            _detailsCard(currentLead.custom.entries
                .where((e) => e.value.toString().isNotEmpty)
                .map((e) =>
                    _detailRow(Icons.edit_note, e.key, e.value.toString()))
                .toList()),
          ],
        ],
      ),
    );
  }

  Widget _actionButton(
      IconData icon, String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(height: 6),
          Text(label,
              style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: color)),
        ],
      ),
    );
  }

  Widget _detailsCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: children
            .asMap()
            .entries
            .map((e) => Column(
                  children: [
                    if (e.key > 0)
                      Divider(height: 1, color: Colors.grey.shade100),
                    e.value,
                  ],
                ))
            .toList(),
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Colors.grey.shade500),
          const SizedBox(width: 12),
          Text(label,
              style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade500,
                  fontWeight: FontWeight.w600)),
          const Spacer(),
          Flexible(
            child: Text(value,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                textAlign: TextAlign.end,
                overflow: TextOverflow.ellipsis),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(
      BuildContext context, LeadProvider leadProv, String ownerId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Lead'),
        content: Text('Are you sure you want to delete "${lead.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final success =
                  await leadProv.deleteLead(id: lead.id, ownerId: ownerId);
              if (success && context.mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Lead deleted')),
                );
              }
            },
            child: const Text('Delete',
                style: TextStyle(color: Colors.red, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}
