import { useState, useEffect, useCallback } from "react";
import { contactsService } from "@/services";
import { authStore } from "@/utils/auth.store";
import type { ContactGroup } from "@/types";

interface UseContactGroupsReturn {
  groups: ContactGroup[];
  loading: boolean;
}

export function useContactGroups(): UseContactGroupsReturn {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const senderId = authStore.getUser()?.id ?? "";
      const result = await contactsService.getGroups(senderId);
      setGroups(result);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { groups, loading };
}
