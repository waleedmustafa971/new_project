import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, DeviceEventEmitter } from "react-native";
import { SESSION_CHANGED } from "../../component/session";

/* =====================
   Types
===================== */

export interface User {
  /* The Mongo document id. Consumers read `_id` -- SocketContext keys the
     socket on it -- so it belongs in the type; `id` was never on the stored
     object and every `user._id` read was silently untyped. */
  _id: string;
  id?: string;
  name: string;
  email: string;
  token?: string;
  // add more fields if needed
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  setUserData: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

/* =====================
   Context
===================== */

const UserContext = createContext<UserContextType | undefined>(undefined);

/* =====================
   Provider
===================== */

interface Props {
  children: ReactNode;
}

export const UserProvider: React.FC<Props> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const STORAGE_KEY = "userdata";

  const refreshUser = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      setUser(jsonValue ? JSON.parse(jsonValue) : null);
    } catch (error) {
      console.error("Failed to load user", error);
    } finally {
      setLoading(false);
    }
  };

  const setUserData = async (userData: User) => {
    try {
      setUser(userData);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error("Failed to save user", error);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to logout", error);
    }
  };

  /*
    Re-read the stored session whenever it changes, not only at mount.

    The mount-only read is what left this context empty for the whole life of
    the process after a sign-in: every auth screen writes `userdata` to
    AsyncStorage directly, and nothing here was listening. See
    component/session.ts for what that broke downstream.

    Two triggers. SESSION_CHANGED is fired by the auth paths the moment they
    finish storing a session, which covers sign-in, OTP verification and the
    Redux login thunk alike. The AppState hook catches the rest -- a session
    written while this provider was not the thing running, and the 401 handler
    in component/api.js clearing storage from outside React.
  */
  useEffect(() => {
    refreshUser();

    const sessionSub = DeviceEventEmitter.addListener(SESSION_CHANGED, refreshUser);
    const appSub = AppState.addEventListener("change", state => {
      if (state === "active") refreshUser();
    });

    return () => {
      sessionSub.remove();
      appSub.remove();
    };
  }, []);

  return (
    <UserContext.Provider
      value={{ user, loading, setUserData, logout, refreshUser }}
    >
      {children}
    </UserContext.Provider>
  );
};

/* =====================
   Hook (Recommended)
===================== */

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
