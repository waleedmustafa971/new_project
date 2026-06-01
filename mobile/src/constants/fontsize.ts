import { useWindowDimensions } from "react-native";

const TABLET_BREAKPOINT = 600;

export const useTypography = () => {
  const { width } = useWindowDimensions();

  const isTablet = width >= TABLET_BREAKPOINT;

  const BASE_FONT = isTablet ? 14 : 12;   // i am using tablet 10 inch its found 15 size it should found 14

  return {
    xs: BASE_FONT - 2,  // 10 / 12
    sm: BASE_FONT,      // 12 / 14 ✅
    md: BASE_FONT + 2,  // 14 / 16
    lg: BASE_FONT + 4,
    xl: BASE_FONT + 6,
    xxl: BASE_FONT + 8,
  };
};