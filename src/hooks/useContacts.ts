import { useState, useEffect, useCallback } from "react";
import { contactsService } from "@/services";
import { authStore } from "@/utils/auth.store";
import type { Contact, ContactsListMeta } from "@/types";

interface UseContactsOptions {
  page?: number;
  limit?: number;
  search?: string;
  tag?: string;
}

interface UseContactsReturn {
  contacts: Contact[];
  meta: ContactsListMeta | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useContacts(options: UseContactsOptions = {}): UseContactsReturn {
  const { page = 1, limit = 10, search, tag } = options;
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [meta, setMeta] = useState<ContactsListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const senderId = authStore.getUser()?.id ?? "";
      const result = await contactsService.getAll({ senderId, page, limit, search, tag });
      setContacts(result.data);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, tag]);

  useEffect(() => { fetch(); }, [fetch]);

  return { contacts, meta, loading, error, refetch: fetch };
}
