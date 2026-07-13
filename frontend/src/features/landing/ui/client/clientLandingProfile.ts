import { useEffect, useState } from "react";
import {
  getClientProfileChangedEventName,
  getPhoneVerificationChangedEventName,
  getStoredClientProfile,
  getStoredPhoneVerification,
} from "../../../../lib/storage";

export type ClientProfileSnapshot = {
  verified: boolean;
  name?: string;
  phone?: string;
  email?: string;
};

function readClientProfileSnapshot(): ClientProfileSnapshot {
  const verification = getStoredPhoneVerification();
  const profile = getStoredClientProfile();
  return {
    verified: Boolean(verification),
    name: profile?.name,
    phone: profile?.phone || verification?.phone,
    email: profile?.email,
  };
}

export function useClientProfileSnapshot(): ClientProfileSnapshot {
  const [snapshot, setSnapshot] = useState<ClientProfileSnapshot>(() => readClientProfileSnapshot());

  useEffect(() => {
    const refresh = () => setSnapshot(readClientProfileSnapshot());
    window.addEventListener(getPhoneVerificationChangedEventName(), refresh);
    window.addEventListener(getClientProfileChangedEventName(), refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(getPhoneVerificationChangedEventName(), refresh);
      window.removeEventListener(getClientProfileChangedEventName(), refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return snapshot;
}
