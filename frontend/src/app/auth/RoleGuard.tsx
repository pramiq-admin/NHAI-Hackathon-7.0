import React, {useEffect} from 'react';
import {useNavigation, CommonActions} from '@react-navigation/native';
import {useSession, type Role} from './sessionStore';

type Props = {
  allow: Exclude<Role, null>;
  redirectTo?: string;
  children: React.ReactNode;
};

/**
 * Wrap a screen / navigator with <RoleGuard allow="admin"> to enforce that the
 * current session has the required role. Mismatch → navigate to redirectTo (default Welcome).
 */
export default function RoleGuard({allow, redirectTo = 'Welcome', children}: Props) {
  const role = useSession(s => s.role);
  const isExpired = useSession(s => s.isExpired);
  const logout = useSession(s => s.logout);
  const navigation = useNavigation();

  useEffect(() => {
    if (role !== allow || isExpired()) {
      if (role !== null && isExpired()) logout();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{name: redirectTo}],
        }),
      );
    }
  }, [role, allow, redirectTo, navigation, isExpired, logout]);

  if (role !== allow) return null;
  return <>{children}</>;
}
