import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { View, PanResponder, AppState, AppStateStatus, StyleSheet } from 'react-native';
import { APP_CONFIG } from '@/core/config/env';

interface InactivityContextValue {
  resetTimer: () => void;
}

const InactivityContext = createContext<InactivityContextValue>({
  resetTimer: () => {},
});

export const useInactivity = () => useContext(InactivityContext);

interface InactivityProviderProps {
  children: React.ReactNode;
  timeoutSeconds?: number;
  onTimeout: () => void;
  isEnabled?: boolean;
}

/**
 * InactivityProvider monitors user interaction touches and app backgrounding time.
 * If inactivity exceeds timeoutSeconds (default 15 minutes), onTimeout is triggered.
 */
export const InactivityProvider: React.FC<InactivityProviderProps> = ({
  children,
  timeoutSeconds = APP_CONFIG.SESSION_INACTIVITY_TIMEOUT_SECONDS,
  onTimeout,
  isEnabled = false,
}) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backgroundTimestampRef = useRef<number | null>(null);
  const timeoutMs = timeoutSeconds * 1000;

  const handleTimeout = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isEnabled) {
      onTimeout();
    }
  }, [isEnabled, onTimeout]);

  const resetTimer = useCallback(() => {
    if (!isEnabled) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(handleTimeout, timeoutMs);
  }, [isEnabled, handleTimeout, timeoutMs]);

  // Listen to AppState (active, background)
  useEffect(() => {
    if (!isEnabled) return;

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimestampRef.current = Date.now();
      } else if (nextState === 'active') {
        if (backgroundTimestampRef.current) {
          const elapsed = Date.now() - backgroundTimestampRef.current;
          if (elapsed >= timeoutMs) {
            handleTimeout();
            return;
          }
        }
        backgroundTimestampRef.current = null;
        resetTimer();
      }
    });

    resetTimer();

    return () => {
      subscription.remove();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isEnabled, resetTimer, timeoutMs, handleTimeout]);

  // Global PanResponder to capture touch events anywhere on the screen
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        resetTimer();
        return false;
      },
      onMoveShouldSetPanResponderCapture: () => {
        resetTimer();
        return false;
      },
    })
  ).current;

  return (
    <InactivityContext.Provider value={{ resetTimer }}>
      <View style={styles.container} {...panResponder.panHandlers}>
        {children}
      </View>
    </InactivityContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

