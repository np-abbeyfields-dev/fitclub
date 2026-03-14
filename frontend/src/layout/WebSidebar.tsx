import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useClub } from '../context/ClubContext';
import { useWindowWidth, useSidebarCollapsedByDefault } from '../hooks';
import { WEB_NAV_ITEMS, type WebRouteId, type WebNavItem } from './webNavConfig';

const SIDEBAR_COLLAPSE_BREAKPOINT = 900;
const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;

type WebSidebarProps = {
  activeRoute: WebRouteId;
  onNavigate: (route: WebRouteId) => void;
};

export function WebSidebar({ activeRoute, onNavigate }: WebSidebarProps) {
  const theme = useTheme();
  const { isAdmin } = useClub();
  const { colors, spacing, radius } = theme;
  const windowWidth = useWindowWidth();
  const collapsedByDefault = useSidebarCollapsedByDefault();

  const [collapsed, setCollapsed] = useState(collapsedByDefault);
  const isNarrow = windowWidth < SIDEBAR_COLLAPSE_BREAKPOINT;
  const effectiveCollapsed = isNarrow ? true : collapsed;
  const sidebarWidth = effectiveCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const visibleItems = useMemo(
    () => WEB_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin]
  );

  const toggleCollapse = () => {
    if (!isNarrow) setCollapsed((c) => !c);
  };

  return (
    <View
      style={[
        styles.sidebar,
        {
          width: sidebarWidth,
          backgroundColor: colors.surface,
          borderRightColor: colors.border,
          zIndex: 10,
          position: 'relative',
        },
      ]}
      pointerEvents="box-none"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingVertical: spacing.sm }]}
        showsVerticalScrollIndicator={false}
      >
        {!effectiveCollapsed && (
          <TouchableOpacity
            onPress={toggleCollapse}
            style={[styles.collapseBtn, { marginBottom: spacing.xs }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        {effectiveCollapsed && !isNarrow && (
          <TouchableOpacity
            onPress={toggleCollapse}
            style={[styles.collapseBtn, { marginBottom: spacing.xs }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {visibleItems.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            active={activeRoute === item.id}
            collapsed={effectiveCollapsed}
            colors={colors}
            spacing={spacing}
            radius={radius}
            onPress={() => onNavigate(item.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function SidebarItem({
  item,
  active,
  collapsed,
  colors,
  spacing,
  radius,
  onPress,
}: {
  item: WebNavItem;
  active: boolean;
  collapsed: boolean;
  colors: Record<string, string>;
  spacing: Record<string, number>;
  radius: Record<string, number>;
  onPress: () => void;
}) {
  const itemStyle = [
    styles.item,
    {
      backgroundColor: active ? colors.primaryMuted : colors.transparent,
      marginHorizontal: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: collapsed ? spacing.xs : spacing.sm,
      borderRadius: radius.md,
    },
  ];
  if (Platform.OS === 'web') {
    (itemStyle as any).cursor = 'pointer';
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={itemStyle}
    >
      <Ionicons
        name={item.icon}
        size={22}
        color={active ? colors.primary : colors.textSecondary}
      />
      {!collapsed && (
        <Text
          style={[
            styles.label,
            {
              fontSize: 15,
              lineHeight: 20,
              color: active ? colors.primary : colors.text,
              marginLeft: spacing.sm,
              fontWeight: (active ? '700' : '500') as '700' | '500',
            },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    borderRightWidth: 1,
    minHeight: '100%',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 8 },
  collapseBtn: {
    alignSelf: 'flex-start',
    padding: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    minHeight: 44,
  },
  label: {
    fontSize: 15,
  },
});
