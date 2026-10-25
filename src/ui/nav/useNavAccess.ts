import { useMemo } from 'react';
import { useAccess } from '../../core/access/useAccess';
import { useAuthStore } from '../../stores/useAuthStore';
import { useBrand } from '../../config/BrandProvider';
import { bottomNavItems, isNavItemVisible, visibleNavGroups, type NavItem } from './navItems';

/** Which destinations the current person may see. Built from `useAccess()`, so it follows the live profile. */
export function useNavVisibility(): (item: NavItem) => boolean {
  const access = useAccess();
  return (item) => isNavItemVisible(item, access);
}

export interface NavGroup {
  key: string;
  title: string;
  items: NavItem[];
}

/** Sidebar / drawer destinations, grouped and already filtered by permissions. */
export function useNavGroups(): NavGroup[] {
  const access = useAccess();
  const rtl = useBrand().direction === 'rtl';
  return useMemo(
    () =>
      visibleNavGroups(access).map(({ def, items }) => ({
        key: def.key,
        title: rtl ? def.titleAr : def.titleEn,
        items,
      })),
    [access, rtl]
  );
}

/** The phone bottom bar for this person (2 to 5 destinations, never a locked one). */
export function useBottomNavItems(): NavItem[] {
  const access = useAccess();
  return useMemo(() => bottomNavItems(access), [access]);
}

/** Name and role line shown in the sidebar footer and the drawer header. */
export function useNavIdentity(): { userName: string; roleLabel: string } {
  const rtl = useBrand().direction === 'rtl';
  const displayName = useAuthStore((s) => s.user?.displayName);
  const { isAdmin } = useAccess();
  return {
    userName: displayName || (rtl ? 'المستخدم' : 'User'),
    roleLabel: isAdmin ? (rtl ? 'مدير النظام' : 'Admin') : rtl ? 'موظف' : 'Employee',
  };
}
