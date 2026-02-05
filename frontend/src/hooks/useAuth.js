// frontend/src/hooks/useAuth.js
import { useState, useEffect } from "react";
import { auth } from "../firebase"; 
import { onAuthStateChanged } from "firebase/auth";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setIsAuthReady(true);
    });

    return unsubscribe;
  }, []);

  return { user, isAuthReady };
};
