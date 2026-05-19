import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<User | null> {
  // Retry once on 401 to handle the race condition right after login,
  // when the session cookie may not have fully propagated yet. Without
  // this, a fresh login can briefly look "unauthenticated" and bounce
  // the user back to /login.
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch("/api/auth/user", {
      credentials: "include",
    });
    if (response.ok) return response.json();
    if (response.status === 401) {
      if (attempt === 0) {
        // wait briefly then retry once
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      return null;
    }
    throw new Error(`${response.status}: ${response.statusText}`);
  }
  return null;
}

async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  window.location.href = "/login";
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
