import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';
import '../../i18n/app_localizations.dart';
import '../../storage/templates_repo.dart';
import '../../models/template.dart';

class AddWorkerScreen extends StatefulWidget {
  const AddWorkerScreen({super.key});

  @override
  State<AddWorkerScreen> createState() => _AddWorkerScreenState();
}

class _AddWorkerScreenState extends State<AddWorkerScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _aadharController = TextEditingController();
  final _roleController = TextEditingController();
  final _siteController = TextEditingController();
  bool _isLoading = false;
  bool _faceEnrolled = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _aadharController.dispose();
    _roleController.dispose();
    _siteController.dispose();
    super.dispose();
  }

  Future<void> _captureAndSave() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Simulate face enrollment (in production, camera capture and embedding)
      await Future.delayed(const Duration(seconds: 2));

      setState(() => _faceEnrolled = true);

      // Save worker template
      final template = FaceTemplate(
        id: const Uuid().v4(),
        userId: _aadharController.text.replaceAll(' ', ''),
        name: _nameController.text.trim(),
        embedding: List.filled(128, 0.0), // Placeholder embedding
        createdAt: DateTime.now().millisecondsSinceEpoch,
      );

      final repo = TemplatesRepo();
      await repo.insertTemplate(template);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.t('add_worker.success')),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
        context.go('/admin/workers');
      }
    } catch (e) {
      setState(() {
        _errorMessage = AppLocalizations.of(context)!.t('add_worker.err_generic');
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      backgroundColor: const Color(0xFF0f0f23),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0f0f23),
        elevation: 0,
        title: Text(
          l10n.t('add_worker.title'),
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Subtitle
                Text(
                  l10n.t('add_worker.subtitle'),
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                ),
                const SizedBox(height: 28),

                // Name field
                _buildLabel(l10n.t('add_worker.name_label')),
                const SizedBox(height: 8),
                _buildTextField(
                  controller: _nameController,
                  hint: l10n.t('add_worker.name_ph'),
                  icon: Icons.person,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) {
                      return l10n.t('add_worker.err_name');
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // Aadhar field
                _buildLabel(l10n.t('add_worker.aadhar_label')),
                const SizedBox(height: 8),
                _buildTextField(
                  controller: _aadharController,
                  hint: '1234 5678 9012',
                  icon: Icons.credit_card,
                  keyboardType: TextInputType.number,
                  helperText: l10n.t('add_worker.aadhar_helper'),
                  validator: (v) {
                    if (v == null || v.replaceAll(' ', '').length != 12) {
                      return l10n.t('add_worker.err_aadhar');
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // Role field
                _buildLabel('Role'),
                const SizedBox(height: 8),
                _buildTextField(
                  controller: _roleController,
                  hint: 'e.g. Machine Operator, Supervisor',
                  icon: Icons.work,
                ),
                const SizedBox(height: 20),

                // Site field
                _buildLabel('Site'),
                const SizedBox(height: 8),
                _buildTextField(
                  controller: _siteController,
                  hint: 'e.g. NH-48 Km 234',
                  icon: Icons.location_on,
                ),
                const SizedBox(height: 24),

                // Face enrollment status
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1a1a3e),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _faceEnrolled
                          ? const Color(0xFF10B981)
                          : const Color(0xFF334155),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _faceEnrolled ? Icons.check_circle : Icons.face,
                        color: _faceEnrolled
                            ? const Color(0xFF10B981)
                            : const Color(0xFF64748B),
                        size: 32,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _faceEnrolled ? 'Face Enrolled' : 'Face Enrollment',
                              style: TextStyle(
                                color: _faceEnrolled
                                    ? const Color(0xFF10B981)
                                    : Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              _faceEnrolled
                                  ? 'Face data captured successfully'
                                  : 'Will capture face on save',
                              style: const TextStyle(
                                color: Color(0xFF94A3B8),
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                if (_errorMessage != null) ...[
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.3)),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: Color(0xFFEF4444), fontSize: 13),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Save button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton.icon(
                    onPressed: _isLoading ? null : _captureAndSave,
                    icon: _isLoading
                        ? const SizedBox.shrink()
                        : const Icon(Icons.camera_alt, color: Colors.white),
                    label: _isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : Text(
                            l10n.t('add_worker.next'),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF3b82f6),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    String? helperText,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF64748B)),
        helperText: helperText,
        helperStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
        filled: true,
        fillColor: const Color(0xFF1a1a3e),
        prefixIcon: Icon(icon, color: const Color(0xFF64748B)),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF334155)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF334155)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF3b82f6), width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFEF4444)),
        ),
      ),
      validator: validator,
    );
  }
}
