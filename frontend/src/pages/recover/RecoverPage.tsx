import { RecoveryConfirmModal } from "../../features/recovery/components/RecoveryConfirmModal";
import { RecoveryEmptyState } from "../../features/recovery/components/RecoveryEmptyState";
import { RecoveryStartModal } from "../../features/recovery/components/RecoveryStartModal";
import { RecoverySuccessState } from "../../features/recovery/components/RecoverySuccessState";
import { useRecoveryFlow } from "../../features/recovery/hooks/useRecoveryFlow";

export default function RecoverPage() {
  const flow = useRecoveryFlow();

  return (
    <main className="recovery-page">
      {flow.step === "start" ? (
        <RecoveryStartModal
          phone={flow.phone}
          setPhone={flow.setPhone}
          onStart={flow.submitStart}
          disabled={!flow.canStart}
          isLoading={flow.isStarting}
          error={flow.startError as Error | null}
        />
      ) : null}

      {flow.step === "confirm" ? (
        <RecoveryConfirmModal
          code={flow.code}
          setCode={flow.setCode}
          expiresLabel={flow.expiresLabel}
          resendAfter={flow.resendAfter}
          onConfirm={flow.submitConfirm}
          onResend={flow.submitResend}
          canConfirm={flow.canConfirm}
          canResend={flow.canResend}
          isConfirming={flow.isConfirming}
          isResending={flow.isResending}
          error={(flow.confirmError ?? flow.resendError) as Error | null}
        />
      ) : null}

      {flow.step === "success" && flow.recovered ? (
        flow.recovered.servicos.length > 0 ? (
          <RecoverySuccessState bookings={flow.recovered.servicos} onRecoverAnother={flow.reset} />
        ) : (
          <RecoveryEmptyState />
        )
      ) : null}
    </main>
  );
}
