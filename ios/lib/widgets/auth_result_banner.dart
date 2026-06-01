import 'package:flutter/material.dart';

enum BannerType { verified, noMatch, spoof, faceLost }

class AuthResultBanner extends StatefulWidget {
  final BannerType type;
  final String message;
  final double? score;
  final int? latencyMs;

  const AuthResultBanner({
    super.key,
    required this.type,
    required this.message,
    this.score,
    this.latencyMs,
  });

  @override
  State<AuthResultBanner> createState() => _AuthResultBannerState();
}

class _AuthResultBannerState extends State<AuthResultBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<Offset> _slideAnim;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, -1),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutCubic,
    ));
    _fadeAnim = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeOut),
    );
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Color get _backgroundColor {
    switch (widget.type) {
      case BannerType.verified:
        return const Color(0xFF10B981);
      case BannerType.noMatch:
        return const Color(0xFFEF4444);
      case BannerType.spoof:
        return const Color(0xFFF97316);
      case BannerType.faceLost:
        return const Color(0xFFF59E0B);
    }
  }

  Color get _textColor {
    switch (widget.type) {
      case BannerType.verified:
      case BannerType.noMatch:
      case BannerType.spoof:
        return Colors.white;
      case BannerType.faceLost:
        return const Color(0xFF1F2937);
    }
  }

  IconData get _icon {
    switch (widget.type) {
      case BannerType.verified:
        return Icons.check_circle;
      case BannerType.noMatch:
        return Icons.cancel;
      case BannerType.spoof:
        return Icons.warning_amber_rounded;
      case BannerType.faceLost:
        return Icons.visibility_off;
    }
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: _slideAnim,
      child: FadeTransition(
        opacity: _fadeAnim,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: _backgroundColor,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: _backgroundColor.withOpacity(0.3),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Row(
            children: [
              Icon(_icon, color: _textColor, size: 24),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      widget.message,
                      style: TextStyle(
                        color: _textColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (widget.score != null || widget.latencyMs != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Row(
                          children: [
                            if (widget.score != null)
                              Text(
                                'Score: ${(widget.score! * 100).toStringAsFixed(1)}%',
                                style: TextStyle(
                                  color: _textColor.withOpacity(0.85),
                                  fontSize: 12,
                                ),
                              ),
                            if (widget.score != null &&
                                widget.latencyMs != null)
                              Padding(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 6),
                                child: Text(
                                  '•',
                                  style: TextStyle(
                                    color: _textColor.withOpacity(0.6),
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            if (widget.latencyMs != null)
                              Text(
                                '${widget.latencyMs}ms',
                                style: TextStyle(
                                  color: _textColor.withOpacity(0.85),
                                  fontSize: 12,
                                ),
                              ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
