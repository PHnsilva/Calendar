import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "../../../lib/api-client";
import { confirmRecovery } from "../api/confirm-recovery";
import { startRecovery } from "../api/start-recovery";
import type { RecoverStartResponse, RecoverConfirmResponse } from "../../../types/api";

type UseRecoveryFlowResult = {
  phone: string;
  setPhone: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  verificationId: string;
  expiresIn: number;
  resendCooldown: number;
  expiresLabel: string;
  start: () => void;
  resend: () => void;
  confirm: () => void;
  canStart: boolean;
  canResend: boolean;
  canConfirm: boolean;
  startResponse: RecoverStartResponse | null;
  confirmResponse: RecoverConfirmResponse | null;
  step: "start" | "confirm" | "success";
  errorMessage: string | null;
  isStarting: boolean;
  isConfirming: boolean;
  isResending: boolean;
};

export function useRecoveryFlow(): UseRecoveryFlowResult {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [expiresIn, setExpiresIn] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [confirmResponse, setConfirmResponse] = useState<RecoverConfirmResponse | null>(null);
  const [startResponse, setStartResponse] = useState<RecoverStartResponse | null>(null);

  useEffect(() => {
    if (expiresIn <= 0) return;
    const timer = window.setTimeout(() => setExpiresIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [expiresIn]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const startMutation = useMutation({
    mutationFn: () => startRecovery({ phone }),
    onSuccess: (response) => {
      setStartResponse(response);
      setConfirmResponse(null);
      setVerificationId(response.verificationId);
      setExpiresIn(response.expiresInSeconds);
      setResendCooldown(response.resendAfterSeconds);
      setCode("");
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => apiPost<RecoverStartResponse>("/api/recovery/resend", { verificationId }),
    onSuccess: (response) => {
      setStartResponse(response);
      setExpiresIn(response.expiresInSeconds);
      setResendCooldown(response.resendAfterSeconds);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmRecovery({ verificationId, code }),
    onSuccess: (response) => {
      setConfirmResponse(response);
    },
  });

  const expiresLabel = useMemo(() => {
    const minutes = Math.floor(expiresIn / 60);
    const seconds = `${Math.max(0, expiresIn % 60)}`.padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [expiresIn]);

  const errorMessage =
    startMutation.error?.message ??
    resendMutation.error?.message ??
    confirmMutation.error?.message ??
    null;

  return {
    phone,
    setPhone,
    code,
    setCode,
    verificationId,
    expiresIn,
    resendCooldown,
    expiresLabel,
    start: () => startMutation.mutate(),
    resend: () => resendMutation.mutate(),
    confirm: () => confirmMutation.mutate(),
    canStart: phone.replace(/\D/g, "").length >= 10 && !startMutation.isPending,
    canResend: Boolean(verificationId) && resendCooldown <= 0 && expiresIn > 0 && !resendMutation.isPending,
    canConfirm: code.trim().length === 3 && Boolean(verificationId) && expiresIn > 0 && !confirmMutation.isPending,
    startResponse,
    confirmResponse,
    step: confirmResponse?.verified ? "success" : verificationId ? "confirm" : "start",
    errorMessage,
    isStarting: startMutation.isPending,
    isConfirming: confirmMutation.isPending,
    isResending: resendMutation.isPending,
  };
}
