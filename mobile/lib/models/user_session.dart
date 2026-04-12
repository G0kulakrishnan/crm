class UserSession {
  final String token;
  final String email;
  final String ownerUserId;
  final String? teamMemberId;
  final String userName;
  final String role;
  final bool isOwner;
  final bool isTeamMember;
  final Map<String, List<String>> perms;

  UserSession({
    required this.token,
    required this.email,
    required this.ownerUserId,
    this.teamMemberId,
    this.userName = '',
    this.role = '',
    this.isOwner = false,
    this.isTeamMember = false,
    this.perms = const {},
  });

  bool can(String module, String action) {
    if (isOwner) return true;
    final modPerms = perms[module];
    if (modPerms == null || modPerms.isEmpty) return false;
    if (action == 'view') return modPerms.isNotEmpty;
    return modPerms.contains(action);
  }

  factory UserSession.fromJson(Map<String, dynamic> json) {
    final rawPerms = json['perms'];
    final Map<String, List<String>> parsedPerms = {};
    if (rawPerms is Map) {
      rawPerms.forEach((key, value) {
        if (value is List) {
          parsedPerms[key.toString()] = value.map((e) => e.toString()).toList();
        }
      });
    }

    return UserSession(
      token: json['token'] ?? '',
      email: json['email'] ?? '',
      ownerUserId: json['ownerUserId'] ?? '',
      teamMemberId: json['teamMemberId'],
      userName: json['userName'] ?? json['name'] ?? '',
      role: json['role'] ?? '',
      isOwner: json['isOwner'] == true,
      isTeamMember: json['isTeamMember'] == true,
      perms: parsedPerms,
    );
  }
}
