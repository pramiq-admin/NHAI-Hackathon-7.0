import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../i18n/app_localizations.dart';

class AdminSignupScreen extends StatefulWidget {
  const AdminSignupScreen({super.key});

  @override
  State<AdminSignupScreen> createState() => _AdminSignupScreenState();
}

class _AdminSignupScreenState extends State<AdminSignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _mobileController = TextEditingController();
  final _aadharController = TextEditingController();
  final _orgController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _nameController.dispose();
    _mobileController.dispose();
    _aadharController.dispose();
    _orgController.dispose();
    super.dispose();
  }

  Future<void> _signup() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Simulate signup process - in production this would call backend
      await Future.delayed(const Duration(seconds: 1));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.t('admin_signup.success')),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
        context.go('/admin/dashboard');
      }
    } catch (e) {
      setState(() {
        _errorMessage = AppLocalizations.of(context)!.t('admin_signup.err_generic');
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
                // Header
                Center(
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1a1a3e),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFf59e0b), width: 2),
                    ),
                    child: const Icon(
                      Icons.person_add,
                      color: Color(0xFFf59e0b),
                      size: 36,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Center(
                  child: Text(
                    l10n.t('admin_signup.title'),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: Text(
                    l10n.t('admin_signup.subtitle'),
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 14,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 32),

                // Name field
                _buildLabel(l10n.t('admin_signup.name_label')),
                const SizedBox(height: 8),
                _buildTextField(
                  controller: _nameController,
                  hint: l10n.t('admin_signup.name_ph'),
                  icon: Icons.person,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) {
                      return l10n.t('admin_signup.err_name');
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // Mobile field
                _buildLabel(l10n.t('admin_signup.mobile_label')),
                const SizedBox(height: 8),
                _buildTextField(
                  controller: _mobileController,
                  hint: l10n.t('admin_signup.mobile_ph'),
                  icon: Icons.phone,
                  keyboardType: TextInputType.phone,
                  validator: (v) {
                    if (v == null || v.trim().length != 10) {
                      return l10n.t('admin_signup.err_mobile');
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // Aadhar field
                _buildLabel(l10n.t('admin_signup.aadhar_label')),
                const SizedBox(height: 8),
                _buildTextField(
                  controller: _aadharController,
                  hint: '1234 5678 9012',
                  icon: Icons.credit_card,
                  keyboardType: TextInputType.number,
                  helperText: l10n.t('admin_signup.aadhar_helper'),
                  validator: (v) {
                    if (v == null || v.replaceAll(' ', '').length != 12) {
                      return l10n.t('admin_signup.err_aadhar');
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // Organization field
                _buildLabel('Organization'),
                const SizedBox(height: 8),
                _buildTextField(
                  controller: _orgController,
                  hint: 'e.g. NHAI Regional Office',
                  icon: Icons.business,
                ),
                const SizedBox(height: 12),

                if (_errorMessage != null) ...[
                  const SizedBox(height: 8),
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
                ],
                const SizedBox(height: 32),

                // Signup button
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _signup,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFf59e0b),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              color: Colors.black,
                              strokeWidth: 2,
                            ),
                          )
                        : Text(
                            l10n.t('admin_signup.next'),
                            style: const TextStyle(
                              color: Colors.black,
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: 16),

                // Already have account
                Center(
                  child: TextButton(
                    onPressed: () => context.go('/admin/login'),
                    child: const Text(
                      'Already have an account? Login',
                      style: TextStyle(
                        color: Color(0xFF3b82f6),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
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
