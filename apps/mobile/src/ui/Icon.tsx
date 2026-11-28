import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';

const DEFAULT_SIZE = 20;

/**
 * A decorative platform icon (SF Symbol on iOS, Material Symbol on Android). It is hidden from
 * screen readers: whatever it means is also said in words by the component that shows it.
 */
export function Icon({
  ios,
  android,
  color,
  size = DEFAULT_SIZE,
}: {
  readonly ios: string;
  readonly android: string;
  readonly color: string;
  readonly size?: number;
}): React.JSX.Element {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SymbolView name={{ ios, android }} tintColor={color} size={size} />
    </View>
  );
}
