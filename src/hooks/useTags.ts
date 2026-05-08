import { useState, useEffect, useCallback } from "react";
import { tagsService } from "@/services/tags.service";
import { authStore } from "@/utils/auth.store";
import type { Tag } from "@/types";

interface UseTagsReturn {
  tags: Tag[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTags(): UseTagsReturn {
  const [tags, setTags]   = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const senderId = authStore.getUser()?.id ?? "";

  const load = useCallback(async () => {
    if (!senderId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await tagsService.getAll(senderId);
      setTags(data);
      setError(null);
    } catch {
      setError("Failed to load tags.");
    } finally {
      setLoading(false);
    }
  }, [senderId]);

  useEffect(() => { load(); }, [load]);

  return { tags, loading, error, refetch: load };
}
