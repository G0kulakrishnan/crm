import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/lead.dart';
import 'stage_badge.dart';
import 'package:intl/intl.dart';

class LeadCard extends StatelessWidget {
  final Lead lead;
  final String wonStage;
  final VoidCallback? onTap;

  const LeadCard({
    super.key,
    required this.lead,
    this.wonStage = 'Won',
    this.onTap,
  });

  void _makeCall() async {
    if (!lead.hasPhone) return;
    final uri = Uri.parse('tel:${lead.phone}');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  void _openWhatsApp() async {
    if (!lead.hasPhone) return;
    final uri = Uri.parse('https://wa.me/${lead.waPhone}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _sendEmail() async {
    if (!lead.hasEmail) return;
    final uri = Uri.parse('mailto:${lead.email}');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = lead.createdDate != null
        ? DateFormat('dd MMM yyyy').format(lead.createdDate!)
        : '';

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              // Avatar
              CircleAvatar(
                radius: 20,
                backgroundColor: StageBadge.getColor(lead.stage, wonStage)
                    .withValues(alpha: 0.15),
                child: Text(
                  lead.name.isNotEmpty ? lead.name[0].toUpperCase() : '?',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: StageBadge.getColor(lead.stage, wonStage),
                    fontSize: 16,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Lead info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      lead.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (lead.companyName.isNotEmpty)
                      Text(
                        lead.companyName,
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey.shade600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    const SizedBox(height: 6),
                    // Badges row
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        StageBadge(stage: lead.stage, wonStage: wonStage),
                        if (lead.requirement.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.deepPurple.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              lead.requirement.toUpperCase(),
                              style: TextStyle(
                                color: Colors.deepPurple.shade700,
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    // Source + date
                    Row(
                      children: [
                        if (lead.source.isNotEmpty) ...[
                          Icon(Icons.source_outlined,
                              size: 11, color: Colors.grey.shade500),
                          const SizedBox(width: 3),
                          Text(
                            lead.source,
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                        if (lead.source.isNotEmpty && dateStr.isNotEmpty)
                          Text('  ·  ',
                              style: TextStyle(
                                  fontSize: 10, color: Colors.grey.shade400)),
                        if (dateStr.isNotEmpty)
                          Text(
                            dateStr,
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.grey.shade500,
                            ),
                          ),
                      ],
                    ),
                    // Follow-up indicator
                    if (lead.followup.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 3),
                        child: Row(
                          children: [
                            Icon(
                              Icons.alarm,
                              size: 11,
                              color: lead.isFollowupOverdue
                                  ? Colors.red
                                  : lead.isFollowupToday
                                      ? Colors.orange
                                      : Colors.grey.shade500,
                            ),
                            const SizedBox(width: 3),
                            Text(
                              lead.followup,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: lead.isFollowupOverdue
                                    ? Colors.red
                                    : lead.isFollowupToday
                                        ? Colors.orange
                                        : Colors.grey.shade500,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              // Action icons
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (lead.hasPhone)
                    _ActionIcon(
                      icon: Icons.phone,
                      color: Colors.green,
                      onTap: _makeCall,
                    ),
                  if (lead.hasPhone)
                    _ActionIcon(
                      icon: Icons.message,
                      color: const Color(0xFF25D366),
                      onTap: _openWhatsApp,
                    ),
                  if (lead.hasEmail)
                    _ActionIcon(
                      icon: Icons.email_outlined,
                      color: Colors.blue,
                      onTap: _sendEmail,
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActionIcon extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ActionIcon({
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Icon(icon, size: 20, color: color),
      ),
    );
  }
}
