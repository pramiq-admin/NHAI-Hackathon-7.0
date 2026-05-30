import React from 'react';
import {Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useTranslation} from 'react-i18next';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import WorkersListScreen from '../screens/admin/WorkersListScreen';
import AdminCalendarScreen from '../screens/admin/AdminCalendarScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';

import {useThemeContext} from '../theme/ThemeContext';
import {COLORS} from '../theme/aaaTheme';

export type AdminTabParamList = {
  Dashboard: undefined;
  Workers: undefined;
  Calendar: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

function TabIcon({label, focused}: {label: string; focused: boolean}) {
  return (
    <Text style={{fontSize: focused ? 24 : 20, opacity: focused ? 1 : 0.6}}>
      {label}
    </Text>
  );
}

export default function AdminTabs() {
  const {t} = useTranslation();
  const {isAAA} = useThemeContext();
  const c = isAAA ? COLORS.aaa : COLORS.normal;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.bg,
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: {fontSize: 12, fontWeight: '600'},
      }}>
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: t('admin_dash.tab', 'Dashboard'),
          tabBarIcon: ({focused}) => <TabIcon label="📊" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Workers"
        component={WorkersListScreen}
        options={{
          tabBarLabel: t('workers_list.tab', 'Workers'),
          tabBarIcon: ({focused}) => <TabIcon label="👷" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={AdminCalendarScreen}
        options={{
          tabBarLabel: t('admin_cal.tab', 'Calendar'),
          tabBarIcon: ({focused}) => <TabIcon label="📅" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={AdminSettingsScreen}
        options={{
          tabBarLabel: t('settings.tab', 'Settings'),
          tabBarIcon: ({focused}) => <TabIcon label="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
