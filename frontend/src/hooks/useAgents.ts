import { useQuery } from '@tanstack/react-query';
import { getAgents, Agent } from '../lib/api';

export function useAgents() {
  return useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => getAgents(),
  });
}
