import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/user_session.dart';

class AuthService {
  Future<UserSession> login(String email, String password) async {
    final response = await http.post(
      Uri.parse(ApiConfig.authEndpoint),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'action': 'login',
        'email': email,
        'password': password,
      }),
    );

    if (response.statusCode != 200) {
      final body = jsonDecode(response.body);
      throw Exception(body['message'] ?? 'Login failed');
    }

    final data = jsonDecode(response.body);
    if (data['success'] != true) {
      throw Exception(data['message'] ?? 'Invalid credentials');
    }

    return UserSession.fromJson({
      ...data,
      'email': email,
    });
  }
}
