import { useMutation } from "@tanstack/react-query";
import { lookupCep } from "../api/lookup-cep";

export function useCepLookup() {
  return useMutation({
    mutationFn: (cep: string) => lookupCep(cep),
  });
}
