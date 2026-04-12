import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/lead.dart';
import '../../providers/auth_provider.dart';
import '../../providers/config_provider.dart';
import '../../providers/lead_provider.dart';

class LeadFormScreen extends StatefulWidget {
  final Lead? lead; // null = create, non-null = edit

  const LeadFormScreen({super.key, this.lead});

  @override
  State<LeadFormScreen> createState() => _LeadFormScreenState();
}

class _LeadFormScreenState extends State<LeadFormScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _saving = false;

  late TextEditingController _name;
  late TextEditingController _companyName;
  late TextEditingController _phone;
  late TextEditingController _email;
  late TextEditingController _notes;

  String _source = '';
  String _stage = '';
  String _requirement = '';
  String _assign = '';
  String _productCat = '';
  String _followup = '';
  Map<String, String> _customValues = {};

  bool get isEdit => widget.lead != null;

  @override
  void initState() {
    super.initState();
    final l = widget.lead;
    _name = TextEditingController(text: l?.name ?? '');
    _companyName = TextEditingController(text: l?.companyName ?? '');
    _phone = TextEditingController(text: l?.phone ?? '');
    _email = TextEditingController(text: l?.email ?? '');
    _notes = TextEditingController(text: l?.notes ?? '');
    _source = l?.source ?? '';
    _stage = l?.stage ?? '';
    _requirement = l?.requirement ?? '';
    _assign = l?.assign ?? '';
    _productCat = l?.productCat ?? '';
    _followup = l?.followup ?? '';
    if (l != null) {
      _customValues = l.custom.map((k, v) => MapEntry(k, v.toString()));
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _companyName.dispose();
    _phone.dispose();
    _email.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _followup.isNotEmpty
          ? (DateTime.tryParse(_followup) ?? now)
          : now,
      firstDate: now.subtract(const Duration(days: 365)),
      lastDate: now.add(const Duration(days: 365 * 2)),
    );
    if (picked != null) {
      setState(() {
        _followup =
            '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      });
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_source.isEmpty) {
      _showError('Please select a source');
      return;
    }
    if (_stage.isEmpty) {
      _showError('Please select a stage');
      return;
    }

    setState(() => _saving = true);

    final auth = context.read<AuthProvider>();
    final leadProv = context.read<LeadProvider>();
    final session = auth.session!;

    final data = {
      'name': _name.text.trim(),
      'companyName': _companyName.text.trim(),
      'phone': _phone.text.trim(),
      'email': _email.text.trim(),
      'source': _source,
      'stage': _stage,
      'requirement': _requirement,
      'assign': _assign.isNotEmpty ? _assign : session.userName,
      'productCat': _productCat,
      'followup': _followup,
      'notes': _notes.text.trim(),
      'custom': _customValues,
    };

    bool success;
    if (isEdit) {
      success = await leadProv.updateLead(
        id: widget.lead!.id,
        ownerId: session.ownerUserId,
        updates: data,
      );
    } else {
      success = await leadProv.createLead(
        ownerId: session.ownerUserId,
        actorId: session.teamMemberId ?? session.ownerUserId,
        userName: session.userName,
        leadData: data,
      );
    }

    setState(() => _saving = false);

    if (success && mounted) {
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(isEdit ? 'Lead updated' : 'Lead created')),
      );
    } else if (mounted) {
      _showError(leadProv.error ?? 'Something went wrong');
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg), backgroundColor: Colors.red));
  }

  @override
  Widget build(BuildContext context) {
    final config = context.watch<ConfigProvider>();

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: Text(isEdit ? 'Edit Lead' : 'Create Lead',
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0.5,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: TextButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(isEdit ? 'Save' : 'Create',
                      style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF16a34a))),
            ),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildCard([
              _textField(_name, 'Name *', Icons.person_outline,
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Name is required' : null),
              _textField(_companyName, 'Company Name', Icons.business),
              _textField(_phone, 'Phone', Icons.phone_outlined,
                  keyboardType: TextInputType.phone),
              _textField(_email, 'Email', Icons.email_outlined,
                  keyboardType: TextInputType.emailAddress),
            ]),
            const SizedBox(height: 12),
            _buildCard([
              _dropdown('Source *', _source, config.sources,
                  (v) => setState(() => _source = v)),
              _dropdown('Stage *', _stage, config.activeStages,
                  (v) => setState(() => _stage = v)),
              _dropdown('Requirement', _requirement, config.requirements,
                  (v) => setState(() => _requirement = v),
                  required: false),
              _dropdown(
                  'Assign To',
                  _assign,
                  config.teamMembers.map((m) => m['name'] as String? ?? '').toList(),
                  (v) => setState(() => _assign = v),
                  required: false),
              if (config.productCats.isNotEmpty)
                _dropdown('Product Category', _productCat, config.productCats,
                    (v) => setState(() => _productCat = v),
                    required: false),
            ]),
            const SizedBox(height: 12),
            _buildCard([
              // Follow-up date
              GestureDetector(
                onTap: _pickDate,
                child: AbsorbPointer(
                  child: TextFormField(
                    decoration: InputDecoration(
                      labelText: 'Follow-up Date',
                      hintText: _followup.isEmpty ? 'Tap to select' : _followup,
                      hintStyle: TextStyle(
                        color: _followup.isEmpty
                            ? Colors.grey.shade400
                            : Colors.black87,
                      ),
                      prefixIcon: Icon(Icons.calendar_today,
                          size: 18, color: Colors.grey.shade500),
                      suffixIcon: _followup.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.close, size: 18),
                              onPressed: () =>
                                  setState(() => _followup = ''),
                            )
                          : null,
                      border: InputBorder.none,
                    ),
                    controller: TextEditingController(text: _followup),
                  ),
                ),
              ),
              _textField(_notes, 'Notes', Icons.notes_outlined,
                  maxLines: 3),
            ]),
            // Custom fields
            if (config.customFields.isNotEmpty) ...[
              const SizedBox(height: 12),
              _buildCard(config.customFields.map((field) {
                final fieldName = field['name'] ?? '';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: TextFormField(
                    initialValue: _customValues[fieldName] ?? '',
                    onChanged: (v) => _customValues[fieldName] = v,
                    decoration: InputDecoration(
                      labelText: fieldName,
                      prefixIcon: Icon(Icons.edit_note,
                          size: 18, color: Colors.grey.shade500),
                      border: InputBorder.none,
                    ),
                    style: const TextStyle(fontSize: 14),
                  ),
                );
              }).toList()),
            ],
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Widget _buildCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: children
            .asMap()
            .entries
            .map((e) => Column(
                  children: [
                    if (e.key > 0)
                      Divider(height: 1, color: Colors.grey.shade100),
                    e.value,
                  ],
                ))
            .toList(),
      ),
    );
  }

  Widget _textField(
    TextEditingController controller,
    String label,
    IconData icon, {
    TextInputType? keyboardType,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        maxLines: maxLines,
        validator: validator,
        decoration: InputDecoration(
          labelText: label,
          labelStyle: TextStyle(fontSize: 13, color: Colors.grey.shade600),
          prefixIcon: Icon(icon, size: 18, color: Colors.grey.shade500),
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        ),
        style: const TextStyle(fontSize: 14),
      ),
    );
  }

  Widget _dropdown(
    String label,
    String value,
    List<String> options,
    ValueChanged<String> onChanged, {
    bool required = true,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12),
        leading: Icon(
          required ? Icons.arrow_drop_down_circle_outlined : Icons.label_outline,
          size: 18,
          color: Colors.grey.shade500,
        ),
        title: Text(
          value.isEmpty ? label : value,
          style: TextStyle(
            fontSize: 14,
            color: value.isEmpty ? Colors.grey.shade600 : Colors.black87,
          ),
        ),
        trailing: const Icon(Icons.chevron_right, size: 18),
        onTap: () {
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
                  child: Text(label,
                      style: const TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w700)),
                ),
                const Divider(height: 1),
                Flexible(
                  child: ListView(
                    shrinkWrap: true,
                    children: [
                      if (!required)
                        ListTile(
                          dense: true,
                          title: const Text('None',
                              style: TextStyle(color: Colors.grey)),
                          onTap: () {
                            onChanged('');
                            Navigator.pop(ctx);
                          },
                        ),
                      ...options.map((opt) => ListTile(
                            dense: true,
                            title: Text(opt,
                                style: TextStyle(
                                    fontWeight: opt == value
                                        ? FontWeight.w700
                                        : FontWeight.w500,
                                    color: opt == value
                                        ? const Color(0xFF16a34a)
                                        : Colors.black87)),
                            trailing: opt == value
                                ? const Icon(Icons.check,
                                    color: Color(0xFF16a34a), size: 20)
                                : null,
                            onTap: () {
                              onChanged(opt);
                              Navigator.pop(ctx);
                            },
                          )),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          );
        },
      ),
    );
  }
}
