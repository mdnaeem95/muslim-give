import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ClockProvider } from '../src/clock/ClockProvider';
import { createClock } from '../src/lib/clock';
import { readSystemDay } from '../src/platform/system-clock';

const systemClock = createClock(readSystemDay);

export default function RootLayout(): React.JSX.Element {
  return (
    <ClockProvider clock={systemClock}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </ClockProvider>
  );
}
