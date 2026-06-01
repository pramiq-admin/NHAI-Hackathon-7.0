import 'package:flutter/material.dart';
import '../challenges/challenge_engine.dart';

/// Display model for a liveness challenge step in the overlay.
class LivenessChallenge {
  final ChallengeType type;
  final String instruction;
  bool passed;

  LivenessChallenge({
    required this.type,
    required this.instruction,
    this.passed = false,
  });
}

class LivenessChallengeOverlay extends StatelessWidget {
  final LivenessChallenge challenge;
  final int countdown;
  final VoidCallback onChallengePassed;

  const LivenessChallengeOverlay({
    super.key,
    required this.challenge,
    required this.countdown,
    required this.onChallengePassed,
  });

  IconData get _challengeIcon {
    switch (challenge.type) {
      case ChallengeType.blink:
        return Icons.visibility;
      case ChallengeType.headLeft:
        return Icons.arrow_back;
      case ChallengeType.headRight:
        return Icons.arrow_forward;
      case ChallengeType.smile:
        return Icons.sentiment_satisfied_alt;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: Container(
        color: const Color(0xAA0F172A),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Challenge icon
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: challenge.passed
                    ? const Color(0xFF10B981).withOpacity(0.2)
                    : Colors.white.withOpacity(0.1),
                border: Border.all(
                  color: challenge.passed
                      ? const Color(0xFF10B981)
                      : Colors.white.withOpacity(0.5),
                  width: 2,
                ),
              ),
              child: Center(
                child: challenge.passed
                    ? const Icon(
                        Icons.check,
                        size: 40,
                        color: Color(0xFF10B981),
                      )
                    : Icon(
                        _challengeIcon,
                        size: 36,
                        color: Colors.white,
                      ),
              ),
            ),
            const SizedBox(height: 24),
            // Instruction text
            Text(
              challenge.instruction,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.w700,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            // Countdown
            if (!challenge.passed)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${countdown}s',
                  style: TextStyle(
                    color: countdown <= 1
                        ? const Color(0xFFEF4444)
                        : Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            // Pass/fail indicator
            if (challenge.passed)
              const Padding(
                padding: EdgeInsets.only(top: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle, color: Color(0xFF10B981), size: 20),
                    SizedBox(width: 6),
                    Text(
                      'Passed',
                      style: TextStyle(
                        color: Color(0xFF10B981),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 32),
            // Direction arrows for head turn challenges
            if (challenge.type == ChallengeType.headLeft &&
                !challenge.passed)
              const Icon(
                Icons.arrow_back_rounded,
                size: 48,
                color: Color(0xFFF59E0B),
              ),
            if (challenge.type == ChallengeType.headRight &&
                !challenge.passed)
              const Icon(
                Icons.arrow_forward_rounded,
                size: 48,
                color: Color(0xFFF59E0B),
              ),
          ],
        ),
      ),
    );
  }
}
