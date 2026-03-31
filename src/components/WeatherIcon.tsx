/** WMO weather code → Ionicons icon. */

import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { weatherIconNameForCode } from '../utils/weatherCode';

export interface WeatherIconProps {
  code: number;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_COLOR = 'rgba(255,255,255,0.95)';

export function WeatherIcon({ code, size = 24, color = DEFAULT_COLOR, style }: WeatherIconProps) {
  const name = weatherIconNameForCode(code);
  return <Ionicons name={name as any} size={size} color={color} style={style} />;
}
