import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
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
} from "@/lib/user-messages";

type UserMessagesContextValue = {
  currentMessage: UserMessage | null;
  dismissMessage: (messageId: string) => void;
  dismissCurrentMessage: () => void;
  activateCurrentMessageAction: () => void;
};

type UserMessagesState = {
  messages: readonly UserMessage[];
  dismissed: StoredUserMessageState;
};

type UserMessagesAction =
  | { type: "messages"; messages: readonly UserMessage[] }
  | { type: "dismissed"; dismissed: StoredUserMessageState };

const UserMessagesContext = createContext<UserMessagesContextValue | null>(null);

function userMessagesReducer(
  state: UserMessagesState,
  action: UserMessagesAction,
): UserMessagesState {
  if (action.type === "messages") {
    return { ...state, messages: action.messages };
  }
  return { ...state, dismissed: action.dismissed };
}

export function UserMessagesProvider({ children }: { children: ReactNode }) {
  const { authToken, isAuthenticated } = useAuth();
  const [state, dispatch] = useReducer(userMessagesReducer, undefined, () => ({
    messages: [],
    dismissed: readDismissedUserMessages(),
  }));

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: "messages", messages: [] });
      return;
    }

    let active = true;

    void Promise.resolve(localUserMessageSource())
      .then((nextMessages) => {
        if (active) {
          dispatch({ type: "messages", messages: nextMessages });
        }
      })
      .catch(() => {
        if (active) {
          dispatch({ type: "messages", messages: [] });
        }
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    function syncDismissedMessages(event: StorageEvent) {
      if (event.key !== DISMISSED_MESSAGES_STORAGE_KEY) {
        return;
      }

      clearDismissedUserMessagesCache();
      dispatch({ type: "dismissed", dismissed: readDismissedUserMessages() });
    }

    window.addEventListener("storage", syncDismissedMessages);

    return () => {
      window.removeEventListener("storage", syncDismissedMessages);
    };
  }, []);

  const currentMessage = isAuthenticated
    ? getNextUserMessage({
        dismissed: state.dismissed,
        messages: state.messages,
      })
    : null;
  const currentMessageId = currentMessage?.id ?? null;
  const currentActionHref = currentMessage
    ? getUserMessageActionHref(currentMessage, authToken)
    : null;

  const dismissMessage = useCallback((messageId: string) => {
    const next = markUserMessageDismissed(readDismissedUserMessages(), messageId);
    writeDismissedUserMessages(next);
    dispatch({ type: "dismissed", dismissed: next });
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
