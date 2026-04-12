import 'package:flutter/material.dart';
import '../models/lead.dart';
import '../services/lead_service.dart';

class LeadProvider extends ChangeNotifier {
  final LeadService _leadService = LeadService();

  List<Lead> _leads = [];
  bool _loading = false;
  String? _error;

  // Filters
  String _searchQuery = '';
  String _sourceFilter = '';
  String _stageFilter = '';
  String _staffFilter = '';

  List<Lead> get allLeads => _leads;
  bool get loading => _loading;
  String? get error => _error;
  String get searchQuery => _searchQuery;
  String get sourceFilter => _sourceFilter;
  String get stageFilter => _stageFilter;
  String get staffFilter => _staffFilter;

  List<Lead> filteredLeads({
    required bool isOwner,
    required bool teamCanSeeAllLeads,
    required String userEmail,
    required String userName,
    required List<String> disabledStages,
  }) {
    var list = _leads.where((l) {
      // Exclude disabled stages
      if (disabledStages.contains(l.stage)) return false;
      // Team member visibility
      if (!isOwner && !teamCanSeeAllLeads) {
        if (l.assign.isNotEmpty &&
            l.assign.toLowerCase() != userEmail.toLowerCase() &&
            l.assign.toLowerCase() != userName.toLowerCase()) {
          return false;
        }
      }
      return true;
    }).toList();

    // Apply filters
    if (_sourceFilter.isNotEmpty) {
      list = list.where((l) => l.source == _sourceFilter).toList();
    }
    if (_stageFilter.isNotEmpty) {
      list = list.where((l) => l.stage == _stageFilter).toList();
    }
    if (_staffFilter.isNotEmpty) {
      if (_staffFilter == 'unassigned') {
        list = list.where((l) => l.assign.isEmpty).toList();
      } else {
        list = list.where((l) =>
            l.assign.toLowerCase() == _staffFilter.toLowerCase()).toList();
      }
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((l) =>
          l.name.toLowerCase().contains(q) ||
          l.phone.toLowerCase().contains(q) ||
          l.email.toLowerCase().contains(q) ||
          l.companyName.toLowerCase().contains(q)).toList();
    }

    // Sort by createdAt descending
    list.sort((a, b) => (b.createdAt ?? 0).compareTo(a.createdAt ?? 0));
    return list;
  }

  // Stats
  Map<String, int> getStats(List<Lead> leads) {
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final weekStart = todayStart.subtract(Duration(days: now.weekday - 1));
    final monthStart = DateTime(now.year, now.month, 1);

    return {
      'total': leads.length,
      'today': leads.where((l) {
        final d = l.createdDate;
        return d != null && d.isAfter(todayStart);
      }).length,
      'thisWeek': leads.where((l) {
        final d = l.createdDate;
        return d != null && d.isAfter(weekStart);
      }).length,
      'thisMonth': leads.where((l) {
        final d = l.createdDate;
        return d != null && d.isAfter(monthStart);
      }).length,
      'followupsDue': leads.where((l) =>
          l.isFollowupOverdue || l.isFollowupToday).length,
    };
  }

  void setSearch(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  void setSourceFilter(String source) {
    _sourceFilter = source;
    notifyListeners();
  }

  void setStageFilter(String stage) {
    _stageFilter = stage;
    notifyListeners();
  }

  void setStaffFilter(String staff) {
    _staffFilter = staff;
    notifyListeners();
  }

  void clearFilters() {
    _searchQuery = '';
    _sourceFilter = '';
    _stageFilter = '';
    _staffFilter = '';
    notifyListeners();
  }

  Future<void> fetchLeads(String ownerId) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _leads = await _leadService.fetchLeads(ownerId);
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
    }

    _loading = false;
    notifyListeners();
  }

  Future<bool> createLead({
    required String ownerId,
    required String actorId,
    required String userName,
    required Map<String, dynamic> leadData,
  }) async {
    try {
      await _leadService.createLead(
        ownerId: ownerId,
        actorId: actorId,
        userName: userName,
        leadData: leadData,
      );
      await fetchLeads(ownerId);
      return true;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateLead({
    required String id,
    required String ownerId,
    required Map<String, dynamic> updates,
  }) async {
    try {
      await _leadService.updateLead(
        id: id,
        ownerId: ownerId,
        updates: updates,
      );
      await fetchLeads(ownerId);
      return true;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteLead({
    required String id,
    required String ownerId,
  }) async {
    try {
      await _leadService.deleteLead(id: id, ownerId: ownerId);
      await fetchLeads(ownerId);
      return true;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      notifyListeners();
      return false;
    }
  }
}
