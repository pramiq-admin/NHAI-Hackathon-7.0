import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'screens/welcome_screen.dart';
import 'screens/home_screen.dart';
import 'screens/enrollment_screen.dart';
import 'screens/verification_screen.dart';
import 'screens/admin_screen.dart';
import 'screens/admin/admin_login_screen.dart';
import 'screens/admin/admin_signup_screen.dart';
import 'screens/admin/admin_dashboard_screen.dart';
import 'screens/admin/workers_list_screen.dart';
import 'screens/admin/add_worker_screen.dart';
import 'screens/admin/admin_calendar_screen.dart';
import 'screens/admin/admin_settings_screen.dart';
import 'screens/worker/worker_login_screen.dart';
import 'screens/worker/punch_screen.dart';
import 'screens/worker/punch_capture_screen.dart';
import 'screens/worker/punch_result_screen.dart';
import 'screens/worker/worker_calendar_screen.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/welcome',
  routes: [
    GoRoute(
      path: '/welcome',
      name: 'welcome',
      builder: (context, state) => const WelcomeScreen(),
    ),
    GoRoute(
      path: '/home',
      name: 'home',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/enroll',
      name: 'enroll',
      builder: (context, state) => const EnrollmentScreen(),
    ),
    GoRoute(
      path: '/verify',
      name: 'verify',
      builder: (context, state) => const VerificationScreen(),
    ),
    GoRoute(
      path: '/admin',
      name: 'admin',
      builder: (context, state) => const AdminScreen(),
    ),
    GoRoute(
      path: '/admin/login',
      name: 'admin-login',
      builder: (context, state) => const AdminLoginScreen(),
    ),
    GoRoute(
      path: '/admin/signup',
      name: 'admin-signup',
      builder: (context, state) => const AdminSignupScreen(),
    ),
    GoRoute(
      path: '/admin/dashboard',
      name: 'admin-dashboard',
      builder: (context, state) => const AdminDashboardScreen(),
    ),
    GoRoute(
      path: '/admin/workers',
      name: 'admin-workers',
      builder: (context, state) => const WorkersListScreen(),
    ),
    GoRoute(
      path: '/admin/workers/add',
      name: 'admin-workers-add',
      builder: (context, state) => const AddWorkerScreen(),
    ),
    GoRoute(
      path: '/admin/calendar',
      name: 'admin-calendar',
      builder: (context, state) => const AdminCalendarScreen(),
    ),
    GoRoute(
      path: '/admin/settings',
      name: 'admin-settings',
      builder: (context, state) => const AdminSettingsScreen(),
    ),
    GoRoute(
      path: '/worker/login',
      name: 'worker-login',
      builder: (context, state) => const WorkerLoginScreen(),
    ),
    GoRoute(
      path: '/worker/punch',
      name: 'worker-punch',
      builder: (context, state) => const PunchScreen(),
    ),
    GoRoute(
      path: '/worker/punch/capture',
      name: 'worker-punch-capture',
      builder: (context, state) {
        final type = state.uri.queryParameters['type'] ?? 'in';
        return PunchCaptureScreen(punchType: type);
      },
    ),
    GoRoute(
      path: '/worker/punch/result',
      name: 'worker-punch-result',
      builder: (context, state) {
        final type = state.uri.queryParameters['type'] ?? 'in';
        final success = state.uri.queryParameters['success'] == 'true';
        final failReason = state.uri.queryParameters['reason'];
        return PunchResultScreen(
          punchType: type,
          success: success,
          failReason: failReason,
        );
      },
    ),
    GoRoute(
      path: '/worker/calendar',
      name: 'worker-calendar',
      builder: (context, state) => const WorkerCalendarScreen(),
    ),
  ],
);
