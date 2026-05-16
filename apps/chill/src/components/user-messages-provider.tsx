import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@chill-institute/auth/auth";
import {
  DISMISSED_MESSAGES_STORAGE_KEY,
  clearDismissedUserMessagesCache,
  getNextUserMessage,
  getUserMessageActionHref,
  localUserMessageSource,
  markUserMessageDismissed,
  readDismissedUserMessages,
  writeDismissedUserMessages,
  type StoredUserMessageState,
  type UserMessage,
  type UserMessageSource,
} from "@/lib/user-messages";

type UserMessagesContextValue = {
  currentMessage: UserMessage | null;
  dismissMessage: (messageId: string) => void;
  dismissCurrentMessage: () => void;
  activateCurrentMessageAction: () => void;
};

const UserMessagesContext = createContext<UserMessagesContextValue | null>(null);

export function UserMessagesProvider({
  children,
  source = localUserMessageSource,
}: {
  children: ReactNode;
  source?: UserMessageSource;
}) {
  const { authToken, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<readonly UserMessage[]>([]);
  const [dismissed, setDismissed] = useState<StoredUserMessageState>(() =>
    readDismissedUserMessages(),
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setMessages([]);
      return;
    }

    let active = true;

    void Promise.resolve(source())
      .then((nextMessages) => {
        if (active) {
          setMessages(nextMessages);
        }
      })
      .catch(() => {
        if (active) {
          setMessages([]);
        }
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, source]);

  useEffect(() => {
    function syncDismissedMessages(event: StorageEvent) {
      if (event.key !== DISMISSED_MESSAGES_STORAGE_KEY) {
        return;
      }

      clearDismissedUserMessagesCache();
      setDismissed(readDismissedUserMessages());
    }

    window.addEventListener("storage", syncDismissedMessages);

    return () => {
      window.removeEventListener("storage", syncDismissedMessages);
    };
  }, []);

  const currentMessage = isAuthenticated
    ? getNextUserMessage({
        dismissed,
        messages,
      })
    : null;
  const currentMessageId = currentMessage?.id ?? null;
  const currentActionHref = currentMessage
    ? getUserMessageActionHref(currentMessage, authToken)
    : null;

  const dismissMessage = useCallback((messageId: string) => {
    setDismissed((current) => {
      const next = markUserMessageDismissed(current, messageId);
      writeDismissedUserMessages(next);
      return next;
    });
  }, []);

  const dismissCurrentMessage = useCallback(() => {
    if (!currentMessageId) return;
    dismissMessage(currentMessageId);
  }, [currentMessageId, dismissMessage]);

  const activateCurrentMessageAction = useCallback(() => {
    if (!currentMessageId || !currentActionHref) return;
    dismissMessage(currentMessageId);
    window.location.href = currentActionHref;
  }, [currentActionHref, currentMessageId, dismissMessage]);

  const value = useMemo(
    () => ({
      currentMessage,
      dismissMessage,
      dismissCurrentMessage,
      activateCurrentMessageAction,
    }),
    [activateCurrentMessageAction, currentMessage, dismissCurrentMessage, dismissMessage],
  );

  return <UserMessagesContext.Provider value={value}>{children}</UserMessagesContext.Provider>;
}

export function useUserMessages() {
  const context = use(UserMessagesContext);
  if (!context) {
    throw new Error("useUserMessages must be used within UserMessagesProvider");
  }
  return context;
}
