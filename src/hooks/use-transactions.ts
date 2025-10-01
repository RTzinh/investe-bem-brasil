import { useMutation, useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Transaction } from "@/lib/types";

export const TRANSACTIONS_QUERY_KEY = ["transactions"] as const;

export function useTransactions(options?: UseQueryOptions<Transaction[], Error>) {
  return useQuery({
    queryKey: TRANSACTIONS_QUERY_KEY,
    queryFn: () => api.getTransactions(),
    staleTime: 1000 * 60,
    ...options,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
    },
  });
}

export function useImportTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.importTransactions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
    },
  });
}
