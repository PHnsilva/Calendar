import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { confirmVerification } from "../api/confirm-verification";
import { resendVerification } from "../api/resend-verification";

type UseOtpFlowOptions = {
  verificationId: string;
  initialResendAfterSeconds: number;
  initialExpiresInSeconds: number;
  onVerified: () => void;
};

export function useOtpFlow({
  verificationId,
  initialResendAfterSeconds,
  initialExpiresInSeconds,
  onVerified,
}: UseOtpFlowOptions) {
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(initialResendAfterSeconds);
  const [expiresIn, setExpiresIn] = useState(initialExpiresInSeconds);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    setCode("");
    setResendCooldown(initialResendAfterSeconds);
    setExpiresIn(initialExpiresInSeconds);
    setFeedbackMessage(null);
  }, [verificationId, initialResendAfterSeconds, initialExpiresInSeconds]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (expiresIn <= 0) return;
    const timer = window.setTimeout(() => setExpiresIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [expiresIn]);

  const confirmMutation = useMutation({
    mutationFn: () => confirmVerification({ verificationId, code }),
    onSuccess: (response) => {
      if (response.verified) {
        setFeedbackMessage("Telefone confirmado com sucesso.");
        onVerified();
      }
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => resendVerification({ verificationId }),
    onSuccess: (response) => {
      setResendCooldown(response.resendAfterSeconds);
      setExpiresIn(response.expiresInSeconds);
      setFeedbackMessage("Novo código enviado.");
    },
  });

  const canConfirm = code.trim().length === 3 && expiresIn > 0 && !confirmMutation.isPending;
  const canResend = resendCooldown <= 0 && expiresIn > 0 && !resendMutation.isPending;

  const expiresLabel = useMemo(() => {
    const minutes = Math.floor(expiresIn / 60);
    const seconds = `${expiresIn % 60}`.padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [expiresIn]);

  return {
    code,
    setCode,
    resendCooldown,
    expiresIn,
    expiresLabel,
    feedbackMessage,
    canConfirm,
    canResend,
    isConfirming: confirmMutation.isPending,
    isResending: resendMutation.isPending,
    confirmError: confirmMutation.error,
    resendError: resendMutation.error,
    submitConfirm: () => confirmMutation.mutate(),
    submitResend: () => resendMutation.mutate(),
  };
}
