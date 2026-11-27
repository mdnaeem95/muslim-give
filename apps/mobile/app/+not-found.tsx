import { Redirect } from 'expo-router';

/** Unknown links open the Dashboard (spec 6.4). */
export default function NotFound(): React.JSX.Element {
  return <Redirect href="/(tabs)/dashboard" />;
}
