import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/config_provider.dart';
import '../../providers/lead_provider.dart';
import '../../widgets/lead_card.dart';
import '../../widgets/stats_card.dart';
import '../../widgets/filter_bar.dart';
import 'lead_form_screen.dart';
import 'lead_detail_screen.dart';

class LeadListScreen extends StatelessWidget {
  const LeadListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final config = context.watch<ConfigProvider>();
    final leadProv = context.watch<LeadProvider>();
    final session = auth.session;
    if (session == null) return const SizedBox.shrink();

    final leads = leadProv.filteredLeads(
      isOwner: session.isOwner,
      teamCanSeeAllLeads: config.teamCanSeeAllLeads,
      userEmail: session.email,
      userName: session.userName,
      disabledStages: config.config?.disabledStages ?? [],
    );
    final stats = leadProv.getStats(leads);
    final canCreate = session.can('Leads', 'create');

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text(
          'Leads',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20),
        ),
        centerTitle: false,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0.5,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, size: 22),
            onPressed: () =>
                leadProv.fetchLeads(session.ownerUserId),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(52),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SizedBox(
              height: 44,
              child: _searchBar(context, leadProv),
            ),
          ),
        ),
      ),
      body: leadProv.loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => leadProv.fetchLeads(session.ownerUserId),
              child: CustomScrollView(
                slivers: [
                  // Stats cards
                  SliverToBoxAdapter(
                    child: Padding(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            StatsCard(
                              label: 'Total',
                              value: stats['total'] ?? 0,
                              color: const Color(0xFF6366f1),
                              icon: Icons.people,
                            ),
                            const SizedBox(width: 10),
                            StatsCard(
                              label: 'Today',
                              value: stats['today'] ?? 0,
                              color: const Color(0xFF16a34a),
                              icon: Icons.today,
                            ),
                            const SizedBox(width: 10),
                            StatsCard(
                              label: 'This Week',
                              value: stats['thisWeek'] ?? 0,
                              color: const Color(0xFF2563eb),
                              icon: Icons.date_range,
                            ),
                            const SizedBox(width: 10),
                            StatsCard(
                              label: 'This Month',
                              value: stats['thisMonth'] ?? 0,
                              color: const Color(0xFFf59e0b),
                              icon: Icons.calendar_month,
                            ),
                            const SizedBox(width: 10),
                            StatsCard(
                              label: 'Follow-ups',
                              value: stats['followupsDue'] ?? 0,
                              color: const Color(0xFFef4444),
                              icon: Icons.alarm,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),

                  // Filter bar
                  SliverToBoxAdapter(
                    child: FilterBar(
                      stages: config.activeStages,
                      sources: config.sources,
                      teamMembers: config.teamMembers,
                      selectedStage: leadProv.stageFilter,
                      selectedSource: leadProv.sourceFilter,
                      selectedStaff: leadProv.staffFilter,
                      showStaffFilter: session.isOwner || config.teamCanSeeAllLeads,
                      onStageChanged: leadProv.setStageFilter,
                      onSourceChanged: leadProv.setSourceFilter,
                      onStaffChanged: leadProv.setStaffFilter,
                      onClear: leadProv.clearFilters,
                    ),
                  ),

                  // Count label
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 4),
                      child: Text(
                        '${leads.length} lead${leads.length != 1 ? 's' : ''}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ),
                  ),

                  // Lead list
                  leads.isEmpty
                      ? SliverFillRemaining(
                          hasScrollBody: false,
                          child: Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.inbox_outlined,
                                    size: 48, color: Colors.grey.shade300),
                                const SizedBox(height: 12),
                                Text(
                                  'No leads found',
                                  style: TextStyle(
                                    fontSize: 15,
                                    color: Colors.grey.shade500,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      : SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (ctx, i) => LeadCard(
                              lead: leads[i],
                              wonStage: config.wonStage,
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) =>
                                      LeadDetailScreen(lead: leads[i]),
                                ),
                              ),
                            ),
                            childCount: leads.length,
                          ),
                        ),

                  // Bottom padding
                  const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
                ],
              ),
            ),
      floatingActionButton: canCreate
          ? FloatingActionButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const LeadFormScreen()),
              ),
              backgroundColor: const Color(0xFF16a34a),
              child: const Icon(Icons.add, color: Colors.white),
            )
          : null,
    );
  }

  Widget _searchBar(BuildContext context, LeadProvider leadProv) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: TextField(
        onChanged: leadProv.setSearch,
        decoration: InputDecoration(
          hintText: 'Search leads...',
          hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
          prefixIcon:
              Icon(Icons.search, size: 20, color: Colors.grey.shade400),
          filled: true,
          fillColor: Colors.grey.shade100,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide.none,
          ),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          isDense: true,
        ),
        style: const TextStyle(fontSize: 13),
      ),
    );
  }
}
