class Lead {
  final String id;
  final String name;
  final String companyName;
  final String email;
  final String phone;
  final String source;
  final String stage;
  final String assign;
  final String followup;
  final String requirement;
  final String notes;
  final String productCat;
  final bool remWA;
  final bool remEmail;
  final bool remSMS;
  final Map<String, dynamic> custom;
  final int? createdAt;
  final int? updatedAt;
  final int? stageChangedAt;

  Lead({
    required this.id,
    this.name = '',
    this.companyName = '',
    this.email = '',
    this.phone = '',
    this.source = '',
    this.stage = '',
    this.assign = '',
    this.followup = '',
    this.requirement = '',
    this.notes = '',
    this.productCat = '',
    this.remWA = false,
    this.remEmail = true,
    this.remSMS = false,
    this.custom = const {},
    this.createdAt,
    this.updatedAt,
    this.stageChangedAt,
  });

  factory Lead.fromJson(Map<String, dynamic> json) {
    return Lead(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      companyName: json['companyName'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      source: json['source'] ?? '',
      stage: json['stage'] ?? '',
      assign: json['assign'] ?? '',
      followup: json['followup'] ?? '',
      requirement: json['requirement'] ?? '',
      notes: json['notes'] ?? '',
      productCat: json['productCat'] ?? '',
      remWA: json['remWA'] == true,
      remEmail: json['remEmail'] != false,
      remSMS: json['remSMS'] == true,
      custom: Map<String, dynamic>.from(json['custom'] ?? {}),
      createdAt: json['createdAt'],
      updatedAt: json['updatedAt'],
      stageChangedAt: json['stageChangedAt'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'companyName': companyName,
      'email': email,
      'phone': phone,
      'source': source,
      'stage': stage,
      'assign': assign,
      'followup': followup,
      'requirement': requirement,
      'notes': notes,
      'productCat': productCat,
      'remWA': remWA,
      'remEmail': remEmail,
      'remSMS': remSMS,
      'custom': custom,
    };
  }

  Lead copyWith({
    String? name,
    String? companyName,
    String? email,
    String? phone,
    String? source,
    String? stage,
    String? assign,
    String? followup,
    String? requirement,
    String? notes,
    String? productCat,
    bool? remWA,
    bool? remEmail,
    bool? remSMS,
    Map<String, dynamic>? custom,
  }) {
    return Lead(
      id: id,
      name: name ?? this.name,
      companyName: companyName ?? this.companyName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      source: source ?? this.source,
      stage: stage ?? this.stage,
      assign: assign ?? this.assign,
      followup: followup ?? this.followup,
      requirement: requirement ?? this.requirement,
      notes: notes ?? this.notes,
      productCat: productCat ?? this.productCat,
      remWA: remWA ?? this.remWA,
      remEmail: remEmail ?? this.remEmail,
      remSMS: remSMS ?? this.remSMS,
      custom: custom ?? this.custom,
      createdAt: createdAt,
      updatedAt: updatedAt,
      stageChangedAt: stageChangedAt,
    );
  }

  bool get hasPhone => phone.isNotEmpty;
  bool get hasEmail => email.isNotEmpty;

  String get normalizedPhone {
    final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
    return digits.length >= 10 ? digits.substring(digits.length - 10) : digits;
  }

  String get waPhone => '91${normalizedPhone}';

  bool get isFollowupOverdue {
    if (followup.isEmpty) return false;
    try {
      final d = DateTime.parse(followup);
      return d.isBefore(DateTime.now().subtract(const Duration(days: 1)));
    } catch (_) {
      return false;
    }
  }

  bool get isFollowupToday {
    if (followup.isEmpty) return false;
    try {
      final d = DateTime.parse(followup);
      final now = DateTime.now();
      return d.year == now.year && d.month == now.month && d.day == now.day;
    } catch (_) {
      return false;
    }
  }

  DateTime? get createdDate =>
      createdAt != null ? DateTime.fromMillisecondsSinceEpoch(createdAt!) : null;
}
