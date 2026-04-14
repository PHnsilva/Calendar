import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { confirmRecovery, resendRecovery } from "../api/confirm-recovery";
import { startRecovery } from "../api/start-recovery";
import type { RecoverConfirmResponse } from "../../../types/api";
import { saveRecoveredBookings } from "../../../lib/storage";

type Step = "start" | "confirm" | "success";

export function useRecoveryFlow() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [expiresIn, setExpiresIn] = useState(0);
  const [resendAfter, setResendAfter] = useState(0);
  const [recovered, setRecovered] = useState<RecoverConfirmResponse | null>(null);
  const [step, setStep] = useState<Step>("start");

  const startMutation = useMutation({
    mutationFn: () => startRecovery(phone),
    onSuccess: (response) => {
      setVerificationId(response.verificationId);
      setExpiresIn(response.expiresInSeconds);
      setResendAfter(response.resendAfterSeconds);
      setCode("");
      setStep("confirm");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmRecovery(verificationId, code),
    onSuccess: (response) => {
      saveRecoveredBookings(response.servicos);
      setRecovered(response);
      setStep("success");
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => resendRecovery(verificationId),
    onSuccess: (response) => {
      setExpiresIn(response.expiresInSeconds);
      setResendAfter(response.resendAfterSeconds);
    },
  });

  useEffect(() => {
    if (step !== "confirm") return;
    if (expiresIn <= 0 && resendAfter <= 0) return;

    const timer = window.setTimeout(() => {
      setExpiresIn((current) => Math.max(0, current - 1));
      setResendAfter((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [step, expiresIn, resendAfter]);

  const canStart = phone.replace(/\D/g, "").length >= 10 && !startMutation.isPending;
  const canConfirm = code.trim().length === 3 && expiresIn > 0 && !confirmMutation.isPending;
  const canResend = resendAfter <= 0 && expiresIn > 0 && !resendMutation.isPending;

  const expiresLabel = useMemo(() => {
    const minutes = Math.floor(expiresIn / 60);
    const seconds = String(expiresIn % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [expiresIn]);

  return {
    step,
    phone,
    setPhone,
    code,
    setCode,
    recovered,
    expiresIn,
    resendAfter,
    expiresLabel,
    verificationId,
    startError: startMutation.error,
    confirmError: confirmMutation.error,
    resendError: resendMutation.error,
    isStarting: startMutation.isPending,
    isConfirming: confirmMutation.isPending,
    isResending: resendMutation.isPending,
    canStart,
    canConfirm,
    canResend,
    submitStart: () => startMutation.mutate(),
    submitConfirm: () => confirmMutation.mutate(),
    submitResend: () => resendMutation.mutate(),
    reset: () => {
      setStep("start");
      setRecovered(null);
      setCode("");
      setVerificationId("");
      setExpiresIn(0);
      setResendAfter(0);
    },
  };
}
