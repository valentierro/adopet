import { Dimensions } from 'react-native';
import { spacing } from './spacing';

const NUM_COLUMNS = 2;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const gap = spacing.sm;
const padding = spacing.md;
const cellWidth = (SCREEN_WIDTH - padding * 2 - gap) / NUM_COLUMNS;
const aspectRatio = 4 / 5;

export const gridLayout = {
  cellWidth,
  gap,
  padding,
  aspectRatio,
} as const;
