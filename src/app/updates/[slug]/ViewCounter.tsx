"use client";

import { useEffect } from "react";

export default function ViewCounter({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/updates/${slug}/view`, {
      method: "POST",
      credentials: "include",
      keepalive: true,
    }).catch(() => {});
  }, [slug]);

  return null;
}
