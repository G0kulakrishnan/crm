import 'package:flutter/material.dart';

class FilterBar extends StatelessWidget {
  final List<String> stages;
  final List<String> sources;
  final List<Map<String, dynamic>> teamMembers;
  final String selectedStage;
  final String selectedSource;
  final String selectedStaff;
  final bool showStaffFilter;
  final ValueChanged<String> onStageChanged;
  final ValueChanged<String> onSourceChanged;
  final ValueChanged<String> onStaffChanged;
  final VoidCallback onClear;

  const FilterBar({
    super.key,
    required this.stages,
    required this.sources,
    required this.teamMembers,
    required this.selectedStage,
    required this.selectedSource,
    required this.selectedStaff,
    required this.showStaffFilter,
    required this.onStageChanged,
    required this.onSourceChanged,
    required this.onStaffChanged,
    required this.onClear,
  });

  bool get hasActiveFilters =>
      selectedStage.isNotEmpty ||
      selectedSource.isNotEmpty ||
      selectedStaff.isNotEmpty;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          _buildChip(
            label: selectedSource.isEmpty ? 'Source' : selectedSource,
            active: selectedSource.isNotEmpty,
            onTap: () => _showPicker(
              context,
              'Select Source',
              ['', ...sources],
              selectedSource,
              onSourceChanged,
            ),
          ),
          const SizedBox(width: 8),
          _buildChip(
            label: selectedStage.isEmpty ? 'Stage' : selectedStage,
            active: selectedStage.isNotEmpty,
            onTap: () => _showPicker(
              context,
              'Select Stage',
              ['', ...stages],
              selectedStage,
              onStageChanged,
            ),
          ),
          if (showStaffFilter) ...[
            const SizedBox(width: 8),
            _buildChip(
              label: selectedStaff.isEmpty ? 'Staff' : selectedStaff,
              active: selectedStaff.isNotEmpty,
              onTap: () => _showPicker(
                context,
                'Select Staff',
                ['', 'unassigned', ...teamMembers.map((m) => m['name'] ?? '')],
                selectedStaff,
                onStaffChanged,
              ),
            ),
          ],
          if (hasActiveFilters) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: onClear,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.close, size: 14, color: Colors.red.shade700),
                    const SizedBox(width: 4),
                    Text('Clear',
                        style: TextStyle(
                            fontSize: 12,
                            color: Colors.red.shade700,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildChip({
    required String label,
    required bool active,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF16a34a).withValues(alpha: 0.1) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: active ? const Color(0xFF16a34a) : Colors.grey.shade300,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: active ? const Color(0xFF16a34a) : Colors.grey.shade700,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.keyboard_arrow_down,
              size: 16,
              color: active ? const Color(0xFF16a34a) : Colors.grey.shade500,
            ),
          ],
        ),
      ),
    );
  }

  void _showPicker(
    BuildContext context,
    String title,
    List<String> options,
    String selected,
    ValueChanged<String> onChanged,
  ) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(title,
                style:
                    const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
          ),
          const Divider(height: 1),
          Flexible(
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: options.length,
              itemBuilder: (_, i) {
                final opt = options[i];
                final label = opt.isEmpty ? 'All' : opt;
                final isSelected = opt == selected;
                return ListTile(
                  dense: true,
                  title: Text(label,
                      style: TextStyle(
                          fontWeight:
                              isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected
                              ? const Color(0xFF16a34a)
                              : Colors.black87)),
                  trailing: isSelected
                      ? const Icon(Icons.check,
                          color: Color(0xFF16a34a), size: 20)
                      : null,
                  onTap: () {
                    onChanged(opt);
                    Navigator.pop(ctx);
                  },
                );
              },
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
