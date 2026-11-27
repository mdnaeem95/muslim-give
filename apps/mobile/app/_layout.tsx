import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ClockProvider } from '../src/clock/ClockProvider';
import { DatabaseProvider } from '../src/data/DatabaseProvider';
import { createClock } from '../src/lib/clock';
import { readSystemDay } from '../src/platform/system-clock';

const systemClock = createClock(readSystemDay);

export default function RootLayout(): React.JSX.Element {
  return (
    <ClockProvider clock={systemClock}>
      <StatusBar style="dark" />
      <DatabaseProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </DatabaseProvider>
    </ClockProvider>
  );
}
