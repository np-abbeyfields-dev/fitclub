import type { Theme } from '@react-navigation/native';
import { DefaultTheme } from '@react-navigation/native';
import { lightColors } from '../theme/colors';
import { darkColors } from '../theme/colors';

export const navLightTheme: Theme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    primary: lightColors.primary,
    background: lightColors.background,
    card: lightColors.surface,
    text: lightColors.text,
    border: lightColors.border,
    notification: lightColors.accent,
  },
};

export const navDarkTheme: Theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    primary: darkColors.primary,
    background: darkColors.background,
    card: darkColors.surface,
    text: darkColors.text,
    border: darkColors.border,
    notification: darkColors.accent,
  },
};
