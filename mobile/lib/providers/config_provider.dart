import 'package:flutter/material.dart';
import '../services/config_service.dart';

class ConfigProvider extends ChangeNotifier {
  final ConfigService _configService = ConfigService();

  CrmConfig? _config;
  bool _loading = false;

  CrmConfig? get config => _config;
  bool get loading => _loading;

  List<String> get activeStages => _config?.activeStages ?? [];
  List<String> get sources => _config?.sources ?? [];
  List<String> get requirements => _config?.requirements ?? [];
  List<String> get productCats => _config?.productCats ?? [];
  List<Map<String, dynamic>> get teamMembers => _config?.teamMembers ?? [];
  List<Map<String, dynamic>> get customFields => _config?.customFields ?? [];
  String? get brandLogo => _config?.brandLogo;
  String? get mobileAppIcon => _config?.mobileAppIcon;
  String? get brandName => _config?.brandName;
  bool get teamCanSeeAllLeads => _config?.teamCanSeeAllLeads ?? false;
  String get wonStage => _config?.wonStage ?? 'Won';

  Future<void> loadConfig(String ownerId) async {
    _loading = true;
    notifyListeners();

    try {
      _config = await _configService.fetchConfig(ownerId);
    } catch (e) {
      debugPrint('Config load error: $e');
    }

    _loading = false;
    notifyListeners();
  }
}
