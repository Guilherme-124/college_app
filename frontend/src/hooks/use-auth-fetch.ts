import { useCallback } from "react";
import { useAuth } from "@clerk/react";

const API_URL = "http://localhost:3000";

type Options = Omit<RequestInit, "headers"> & {headers?: Record<string, string>};

export function useAuthFetch() {
  const {getToken} = useAuth();

  return useCallback(
    async (path: string, options: Options={}) => {
      const token = await getToken();
      
      return fetch(`${API_URL}${path}`, {
        ...options,
        headers: {...options.headers, Authorization: `Bearer ${token}`}
      });
    }, [getToken]
  )
}