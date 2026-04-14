import { useNavigate } from "react-router-dom";
import { saveManageToken } from "../../lib/storage";
import { RecoveryConfirmModal } from "../../features/recovery/components/RecoveryConfirmModal";
import { RecoveryStartModal } from "../../features/recovery/components/RecoveryStartModal";
import { RecoverySuccessState } from "../../features/recovery/components/RecoverySuccessState";
import { useRecoveryFlow } from "../../features/recovery/hooks/useRecoveryFlow";

export default function RecoverPage() {
  const navigate = useNavigate();
  const recovery = useRecoveryFlow();

  const handleOpenMyBookings = () => {
    (recovery.confirmResponse?.items ?? []).forEach((item) =>
      saveManageToken(item.manageToken, item.servico.eventId),
    );

    const firstToken = recovery.confirmResponse?.items?.[0]?.manageToken ?? "";
    navigate(firstToken ? `/my?token=${encodeURIComponent(firstToken)}` : "/my");
  };

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", display: "grid", gap: 16 }}>
      <header style={{ display: "grid", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.65 }}>Sprint 2</span>
        <h1 style={{ margin: 0 }}>Recuperação de agendamentos</h1>
        <p style={{ margin: 0, opacity: 0.8 }}>
          Fluxo completo de recuperação por telefone, sem depender de Meta para o MVP.
        </p>
      </header>

      {recovery.errorMessage ? (
        <div style={{ padding: 12, borderRadius: 14, background: "rgba(220,38,38,.08)", color: "#991b1b" }}>
          {recovery.errorMessage}
        </div>
      ) : null}

      {recovery.step === "start" ? (
        <RecoveryStartModal
          phone={recovery.phone}
          onPhoneChange={recovery.setPhone}
          onStart={recovery.start}
          canStart={recovery.canStart}
          isStarting={recovery.isStarting}
        />
      ) : null}

      {recovery.step === "confirm" ? (
        <RecoveryConfirmModal
          code={recovery.code}
          expiresLabel={recovery.expiresLabel}
          resendCooldown={recovery.resendCooldown}
          onCodeChange={recovery.setCode}
          onConfirm={recovery.confirm}
          onResend={recovery.resend}
          canConfirm={recovery.canConfirm}
          canResend={recovery.canResend}
          isConfirming={recovery.isConfirming}
          isResending={recovery.isResending}
        />
      ) : null}

      {recovery.step === "success" && recovery.confirmResponse ? (
        <RecoverySuccessState response={recovery.confirmResponse} onOpenMyBookings={handleOpenMyBookings} />
      ) : null}
    </main>
  );
}
