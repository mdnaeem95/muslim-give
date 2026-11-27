import type { CivilDate } from '@muslim-give/domain';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { Clock } from '../lib/clock';
import { millisUntilLocalMidnight } from '../platform/system-clock';

const TodayContext = createContext<CivilDate | null>(null);

/** One second past midnight, so a timer that fires slightly early still lands on the new day. */
const MIDNIGHT_MARGIN_MS = 1_000;

/**
 * Holds "today" for the whole app (spec 7.2). It is refreshed when the app returns to the
 * foreground and at local midnight, so a traveller or an overnight app sees the right day.
 */
export function ClockProvider({
  clock,
  children,
}: {
  readonly clock: Clock;
  readonly children: ReactNode;
}): React.JSX.Element {
  const [today, setToday] = useState<CivilDate>(() => clock.today());

  useEffect(() => {
    const refresh = (): void => {
      setToday(clock.today());
    };
    const timer = setTimeout(refresh, millisUntilLocalMidnight() + MIDNIGHT_MARGIN_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [clock, today]);

  return <TodayContext.Provider value={today}>{children}</TodayContext.Provider>;
}

export function useToday(): CivilDate {
  const today = useContext(TodayContext);
  if (today === null) throw new Error('clock.missing_provider');
  return today;
}
