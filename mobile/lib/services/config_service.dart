import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class CrmConfig {
  final List<String> stages;
  final List<String> sources;
  final List<String> requirements;
  final List<String> productCats;
  final List<String> disabledStages;
  final List<Map<String, dynamic>> customFields;
  final List<Map<String, dynamic>> teamMembers;
  final String wonStage;
  final String lostStage;
  final bool teamCanSeeAllLeads;
  final String? brandLogo;
  final String? mobileAppIcon;
  final String? brandName;

  CrmConfig({
    this.stages = const [],
    this.sources = const [],
    this.requirements = const [],
    this.productCats = const [],
    this.disabledStages = const [],
    this.customFields = const [],
    this.teamMembers = const [],
    this.wonStage = 'Won',
    this.lostStage = 'Lost',
    this.teamCanSeeAllLeads = false,
    this.brandLogo,
    this.mobileAppIcon,
    this.brandName,
  });

  List<String> get activeStages =>
      stages.where((s) => !disabledStages.contains(s)).toList();
}

class ConfigService {
  Future<CrmConfig> fetchConfig(String ownerId) async {
    // Fetch user profile
    final profileRes = await http.get(
      Uri.parse('${ApiConfig.dataEndpoint}?module=userProfiles&ownerId=$ownerId'),
    );

    // Fetch team members
    final teamRes = await http.get(
      Uri.parse('${ApiConfig.dataEndpoint}?module=teams&ownerId=$ownerId'),
    );

    // Fetch global settings (for brand icon)
    final settingsRes = await http.get(
      Uri.parse('${ApiConfig.dataEndpoint}?module=globalSettings&ownerId=$ownerId'),
    );

    Map<String, dynamic> profile = {};
    if (profileRes.statusCode == 200) {
      final data = jsonDecode(profileRes.body);
      final list = data['data'] as List? ?? [];
      if (list.isNotEmpty) profile = list[0];
    }

    List<Map<String, dynamic>> teamList = [];
    if (teamRes.statusCode == 200) {
      final data = jsonDecode(teamRes.body);
      final list = data['data'] as List? ?? [];
      teamList = list.map((e) => Map<String, dynamic>.from(e)).toList();
    }

    Map<String, dynamic> settings = {};
    if (settingsRes.statusCode == 200) {
      final data = jsonDecode(settingsRes.body);
      final list = data['data'] as List? ?? [];
      if (list.isNotEmpty) settings = list[0];
    }

    return CrmConfig(
      stages: _toStringList(profile['stages']) ?? ApiConfig.defaultStages,
      sources: _toStringList(profile['sources']) ?? ApiConfig.defaultSources,
      requirements: _toStringList(profile['requirements']) ?? ApiConfig.defaultRequirements,
      productCats: _toStringList(profile['productCats']) ?? ApiConfig.defaultProductCats,
      disabledStages: _toStringList(profile['disabledStages']) ?? [],
      customFields: (profile['customFields'] as List?)
              ?.map((e) => Map<String, dynamic>.from(e))
              .toList() ??
          [],
      teamMembers: teamList,
      wonStage: profile['wonStage'] ?? 'Won',
      lostStage: profile['lostStage'] ?? 'Lost',
      teamCanSeeAllLeads: profile['teamCanSeeAllLeads'] == true,
      brandLogo: settings['brandLogo'] ?? profile['logo'],
      mobileAppIcon: settings['mobileAppIcon'],
      brandName: settings['brandName'],
    );
  }

  List<String>? _toStringList(dynamic value) {
    if (value == null) return null;
    if (value is List) return value.map((e) => e.toString()).toList();
    return null;
  }
}
