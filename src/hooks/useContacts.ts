import { useState, useEffect, useCallback } from "react";
import { contactsService } from "@/services";
import type { Contact, ContactsResponse } from "@/types";

interface UseContactsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  tag?: string;
}

interface UseContactsReturn {
  contacts: Contact[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useContacts(options: UseContactsOptions = {}): UseContactsReturn {
  const { page = 1, pageSize = 10, search, tag } = options;
  const [data, setData] = useState<ContactsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await contactsService.getAll(page, pageSize, search, tag);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, tag]);

  useEffect(() => { fetch(); }, [fetch]);

  return {
    contacts: data?.data ?? [],
    total: data?.total ?? 0,
    loading,
    error,
    refetch: fetch,
  };
}
