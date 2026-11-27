import { Redirect } from 'expo-router';

/** The Dashboard is the default route on every cold start (spec 6.4). */
export default function Index(): React.JSX.Element {
  return <Redirect href="/(tabs)/dashboard" />;
}
