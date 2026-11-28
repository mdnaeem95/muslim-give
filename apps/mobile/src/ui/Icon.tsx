import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { View } from 'react-native';

const DEFAULT_SIZE = 20;

/**
 * A decorative platform icon (SF Symbol on iOS, Material Symbol on Android). It is hidden from
 * screen readers: whatever it means is also said in words by the component that shows it.
 * `name` is typed by expo-symbols, so an unknown symbol name fails the typecheck.
 */
export function Icon({
  name,
  color,
  size = DEFAULT_SIZE,
}: {
  readonly name: SymbolViewProps['name'];
  readonly color: string;
  readonly size?: number;
}): React.JSX.Element {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SymbolView name={name} tintColor={color} size={size} />
    </View>
  );
}
