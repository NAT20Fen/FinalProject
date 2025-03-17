import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error(`API Error: ${res.status} - ${text}`);
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper to get the correct API base URL
function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.PROD ? '/.netlify/functions/api' : '/api';
  console.log('API Base URL:', baseUrl);
  return baseUrl;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  let body: string | FormData | undefined = undefined;

  if (data instanceof FormData) {
    body = data;
  } else if (data) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(data);
  }

  // Prepend API base URL in production
  const apiUrl = url.startsWith('/api/') 
    ? `${getApiBaseUrl()}${url.substring(4)}`
    : url;

  console.log(`Making ${method} request to:`, apiUrl);

  try {
    const res = await fetch(apiUrl, {
      method,
      headers,
      body,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiBaseUrl();
    const url = (queryKey[0] as string).startsWith('/api/')
      ? `${baseUrl}${(queryKey[0] as string).substring(4)}`
      : queryKey[0] as string;

    console.log('Query request to:', url);

    try {
      const res = await fetch(url, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log('Returning null for 401 response as configured');
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      console.log('Query response:', data);
      return data;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});