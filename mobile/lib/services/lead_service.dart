import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/lead.dart';

class LeadService {
  Future<List<Lead>> fetchLeads(String ownerId) async {
    final response = await http.get(
      Uri.parse('${ApiConfig.dataEndpoint}?module=leads&ownerId=$ownerId'),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to fetch leads');
    }

    final data = jsonDecode(response.body);
    if (data['success'] != true) {
      throw Exception(data['message'] ?? 'Failed to fetch leads');
    }

    final list = data['data'] as List? ?? [];
    return list.map((json) => Lead.fromJson(json)).toList();
  }

  Future<String> createLead({
    required String ownerId,
    required String actorId,
    required String userName,
    required Map<String, dynamic> leadData,
  }) async {
    final response = await http.post(
      Uri.parse(ApiConfig.dataEndpoint),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'module': 'leads',
        'ownerId': ownerId,
        'actorId': actorId,
        'userName': userName,
        'logText': 'Lead created from mobile app',
        ...leadData,
      }),
    );

    if (response.statusCode != 200 && response.statusCode != 201) {
      final body = jsonDecode(response.body);
      throw Exception(body['message'] ?? 'Failed to create lead');
    }

    final data = jsonDecode(response.body);
    return data['id'] ?? '';
  }

  Future<void> updateLead({
    required String id,
    required String ownerId,
    required Map<String, dynamic> updates,
  }) async {
    final response = await http.patch(
      Uri.parse(ApiConfig.dataEndpoint),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'module': 'leads',
        'id': id,
        'ownerId': ownerId,
        'logText': 'Lead updated from mobile app',
        ...updates,
      }),
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['message'] ?? 'Failed to update lead');
    }
  }

  Future<void> deleteLead({
    required String id,
    required String ownerId,
  }) async {
    final response = await http.delete(
      Uri.parse(ApiConfig.dataEndpoint),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'module': 'leads',
        'id': id,
        'ownerId': ownerId,
      }),
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['message'] ?? 'Failed to delete lead');
    }
  }
}
