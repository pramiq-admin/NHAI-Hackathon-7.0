import {useCallback, useMemo, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {getTodayEvents, type PunchEventRow} from '../../storage/db/punchEvents.repo';
import {calculateDuration, type Duration} from '../utils/timeCalc';

export type PunchStatusKind = 'idle' | 'punched_in' | 'completed';

export type PunchStatus = {
  kind: PunchStatusKind;
  todayEvents: PunchEventRow[];
  lastPunchIn: PunchEventRow | null;
  lastPunchOut: PunchEventRow | null;
  todayDuration: Duration | null;
  refresh: () => void;
};

export function usePunchStatus(workerId: string | null | undefined): PunchStatus {
  const [todayEvents, setTodayEvents] = useState<PunchEventRow[]>([]);

  const refresh = useCallback(() => {
    if (!workerId) {
      setTodayEvents([]);
      return;
    }
    try {
      setTodayEvents(getTodayEvents(workerId));
    } catch {
      setTodayEvents([]);
    }
  }, [workerId]);

  // useFocusEffect already fires on initial focus (= initial mount of the
  // owning screen) AND on every re-focus, so a separate useEffect would be
  // redundant work.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Single pass — find latest 'in' and latest 'out' without allocating
  // intermediate reversed arrays on every render.
  return useMemo(() => {
    let lastPunchIn: PunchEventRow | null = null;
    let lastPunchOut: PunchEventRow | null = null;
    for (const e of todayEvents) {
      if (e.type === 'in') lastPunchIn = e;
      else if (e.type === 'out') lastPunchOut = e;
    }

    let kind: PunchStatusKind = 'idle';
    if (lastPunchIn && !lastPunchOut) {
      kind = 'punched_in';
    } else if (
      lastPunchIn &&
      lastPunchOut &&
      lastPunchOut.timestamp > lastPunchIn.timestamp
    ) {
      kind = 'completed';
    } else if (lastPunchIn && lastPunchOut) {
      // Both exist but latest 'in' is AFTER latest 'out' → punched back in.
      kind = 'punched_in';
    }

    const todayDuration =
      lastPunchIn && lastPunchOut && lastPunchOut.timestamp > lastPunchIn.timestamp
        ? calculateDuration(lastPunchIn.timestamp, lastPunchOut.timestamp)
        : lastPunchIn && (!lastPunchOut || lastPunchIn.timestamp > lastPunchOut.timestamp)
          ? calculateDuration(lastPunchIn.timestamp, Date.now())
          : null;

    return {
      kind,
      todayEvents,
      lastPunchIn,
      lastPunchOut,
      todayDuration,
      refresh,
    };
  }, [todayEvents, refresh]);
}
