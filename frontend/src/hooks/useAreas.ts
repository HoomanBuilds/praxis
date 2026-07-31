import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AREAS } from "@/lib/constants";

export function useAreas() {
  const { data } = useQuery({
    queryKey: ["functional-areas"],
    queryFn: api.getFunctionalAreas,
    staleTime: 60_000,
  });
  const keys = data ? Object.keys(data) : AREAS.slice(1);
  return ["all", ...keys];
}
