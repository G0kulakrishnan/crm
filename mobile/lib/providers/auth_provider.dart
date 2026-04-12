import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/user_session.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  UserSession? _session;
  bool _loading = false;
  String? _error;

  UserSession? get session => _session;
  bool get isLoggedIn => _session != null;
  bool get loading => _loading;
  String? get error => _error;

  bool can(String module, String action) {
    return _session?.can(module, action) ?? false;
  }

  Future<void> tryAutoLogin() async {
    try {
      final sessionJson = await _storage.read(key: 'session');
      if (sessionJson != null) {
        final data = jsonDecode(sessionJson);
        _session = UserSession.fromJson(data);
        notifyListeners();
      }
    } catch (_) {
      // No stored session or corrupted data
    }
  }

  Future<bool> login(String email, String password) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _session = await _authService.login(email, password);
      // Store session for auto-login
      await _storage.write(
        key: 'session',
        value: jsonEncode({
          'token': _session!.token,
          'email': _session!.email,
          'ownerUserId': _session!.ownerUserId,
          'teamMemberId': _session!.teamMemberId,
          'userName': _session!.userName,
          'role': _session!.role,
          'isOwner': _session!.isOwner,
          'isTeamMember': _session!.isTeamMember,
          'perms': _session!.perms.map((k, v) => MapEntry(k, v)),
        }),
      );
      _loading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: 'session');
    _session = null;
    notifyListeners();
  }
}
