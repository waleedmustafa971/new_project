import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* =====================
   Types
===================== */

export interface User {
  id: string;
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

  useEffect(() => {
    refreshUser();
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
