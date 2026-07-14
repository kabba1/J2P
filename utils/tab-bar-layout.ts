const TAB_CONTENT_HEIGHT = 64;
const MINIMUM_BOTTOM_PADDING = 8;

export type TabBarLayout = {
  height: number;
  paddingBottom: number;
};

export function getTabBarLayout(bottomInset: number): TabBarLayout {
  const safeInset = Number.isFinite(bottomInset) ? Math.max(0, bottomInset) : 0;
  const paddingBottom = Math.max(MINIMUM_BOTTOM_PADDING, safeInset);

  return {
    height: TAB_CONTENT_HEIGHT + paddingBottom,
    paddingBottom,
  };
}
