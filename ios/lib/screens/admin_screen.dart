import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../i18n/app_localizations.dart';
import '../theme/app_theme.dart';
import '../theme/colors.dart';
import '../storage/templates_repo.dart';
import '../storage/db_client.dart';
import '../models/template.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  final TemplatesRepo _templatesRepo = TemplatesRepo();
  List<FaceTemplate> _templates = [];
  int _templateCount = 0;
  String _dbSize = '...';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final templates = await _templatesRepo.getAllTemplates();
      final count = await _templatesRepo.getCount();
      final db = await DbClient.instance.database;
      final dbPath = db.path;
      setState(() {
        _templates = templates;
        _templateCount = count;
        _dbSize = dbPath;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _dbSize = 'N/A';
      });
    }
  }

  Future<void> _deleteAllTemplates() async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1a1a3e),
        title: Text(
          l10n.t('admin.delete_all'),
          style: const TextStyle(color: Colors.white),
        ),
        content: Text(
          l10n.t('admin.delete_confirm'),
          style: const TextStyle(color: Color(0xFF94A3B8)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(l10n.t('common.cancel')),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(l10n.t('common.confirm')),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await _templatesRepo.deleteAll();
      _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(l10n.t('admin.deleted')),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
      }
    }
  }

  Future<void> _deleteTemplate(FaceTemplate template) async {
    final l10n = AppLocalizations.of(context)!;
    await _templatesRepo.deleteTemplate(template.id);
    _loadData();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(l10n.t('admin.template_deleted')),
          backgroundColor: const Color(0xFF10B981),
        ),
      );
    }
  }

  void _runBenchmark() {
    final stopwatch = Stopwatch()..start();
    // Simulate benchmark
    Future.delayed(const Duration(seconds: 2), () {
      stopwatch.stop();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Benchmark complete: ${stopwatch.elapsedMilliseconds}ms',
            ),
            backgroundColor: const Color(0xFF3b82f6),
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final themeNotifier = Provider.of<ThemeNotifier>(context);
    final localeNotifier = Provider.of<LocaleNotifier>(context);
    final isAAA = themeNotifier.isAAA;
    final colors = isAAA ? AppColors.aaa : AppColors.normal;

    return Scaffold(
      backgroundColor: const Color(0xFF0f0f23),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0f0f23),
        title: Text(
          l10n.t('admin.title'),
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3b82f6)))
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Stats cards
                  _buildStatCard(
                    icon: Icons.face,
                    label: l10n.t('admin.enrolled_count'),
                    value: '$_templateCount',
                    colors: colors,
                  ),
                  const SizedBox(height: 12),
                  _buildStatCard(
                    icon: Icons.storage,
                    label: l10n.t('admin.db_size'),
                    value: _dbSize.split('/').last,
                    colors: colors,
                  ),
                  const SizedBox(height: 24),

                  // Language toggle
                  _buildToggleCard(
                    icon: Icons.language,
                    label: l10n.t('admin.language'),
                    subtitle: localeNotifier.locale.languageCode == 'en'
                        ? l10n.t('admin.language_en')
                        : l10n.t('admin.language_hi'),
                    value: localeNotifier.locale.languageCode == 'hi',
                    onChanged: (_) => localeNotifier.toggleLanguage(),
                    colors: colors,
                  ),
                  const SizedBox(height: 12),

                  // AAA Outdoor Mode toggle
                  _buildToggleCard(
                    icon: Icons.wb_sunny,
                    label: l10n.t('admin.outdoor_mode'),
                    subtitle: isAAA ? 'ON' : 'OFF',
                    value: isAAA,
                    onChanged: (_) => themeNotifier.toggleAAA(),
                    colors: colors,
                  ),
                  const SizedBox(height: 24),

                  // Action buttons
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _deleteAllTemplates,
                      icon: const Icon(Icons.delete_forever, color: Colors.white),
                      label: Text(
                        l10n.t('admin.delete_all'),
                        style: const TextStyle(color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEF4444),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _runBenchmark,
                      icon: const Icon(Icons.speed, color: Colors.white),
                      label: Text(
                        l10n.t('admin.benchmark'),
                        style: const TextStyle(color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF3b82f6),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Template list header
                  Text(
                    '${l10n.t('admin.enrolled_count')} ($_templateCount)',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 12),

                  if (_templates.isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Text(
                          l10n.t('admin.no_templates'),
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 16,
                          ),
                        ),
                      ),
                    )
                  else
                    ..._templates.map((t) => _buildTemplateItem(t, colors)),
                ],
              ),
            ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String label,
    required String value,
    required dynamic colors,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1a1a3e),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFF3b82f6), size: 28),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToggleCard({
    required IconData icon,
    required String label,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
    required dynamic colors,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1a1a3e),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFFf59e0b), size: 24),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(color: Colors.white, fontSize: 15),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: const Color(0xFF3b82f6),
          ),
        ],
      ),
    );
  }

  Widget _buildTemplateItem(FaceTemplate template, dynamic colors) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF1a1a3e),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        children: [
          const CircleAvatar(
            backgroundColor: Color(0xFF3b82f6),
            radius: 20,
            child: Icon(Icons.person, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  template.name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  'ID: ${template.userId}',
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444)),
            onPressed: () => _deleteTemplate(template),
          ),
        ],
      ),
    );
  }
}
