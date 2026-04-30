import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { confirmRecovery, resendRecovery } from '../../recovery/api/confirm-recovery';
import { startRecovery } from '../../recovery/api/start-recovery';
import {
  formatPhoneForDisplay,
  getStoredPhoneVerification,
  isValidBrazilianPhone,
  normalizeBrazilianPhone,
  savePhoneVerification,
  saveRecoveredBookings,
} from '../../../lib/storage';
import type { RecoverConfirmResponse, ServicoResponse } from '../../../types/api';

type HomeMobileProfileSheetProps = {
  open: boolean;
  onClose: () => void;
  onRecoveredBookings?: (bookings: ServicoResponse[]) => void;
  onOpenRecoveredBookings?: () => void;
};

type Step = 'phone' | 'code' | 'success';

type WindowWithOtpCredential = Window & {
  OTPCredential?: unknown;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 3);
}

function canUseWebOtp() {
  const otpWindow = window as WindowWithOtpCredential;
  return 'OTPCredential' in otpWindow && 'credentials' in navigator;
}

function formatRecoveredCount(count: number) {
  if (count === 0) return 'Nenhum agendamento encontrado para esse telefone.';
  if (count === 1) return '1 agendamento recuperado para esse telefone.';
  return `${count} agendamentos recuperados para esse telefone.`;
}

function formatSavedAt(value?: string) {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

export default function HomeMobileProfileSheet({
  open,
  onClose,
  onRecoveredBookings,
  onOpenRecoveredBookings,
}: HomeMobileProfileSheetProps) {
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [resendAfter, setResendAfter] = useState(0);
  const [recovered, setRecovered] = useState<RecoverConfirmResponse | null>(null);
  const [savedAt, setSavedAt] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const expiresLabel = useMemo(() => {
    const minutes = Math.floor(expiresIn / 60);
    const seconds = String(expiresIn % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [expiresIn]);

  const confirmedPhoneLabel = formatPhoneForDisplay(normalizedPhone || phone);
  const recoveredCount = recovered?.servicos.length ?? getStoredPhoneVerification()?.recoveredCount ?? 0;
  const canConfirm = code.length === 3 && expiresIn > 0 && !isConfirming;
  const canResend = resendAfter <= 0 && expiresIn > 0 && !isResending;

  useEffect(() => {
    if (!open) return;

    const stored = getStoredPhoneVerification();
    setErrorMessage('');
    setCode('');
    setVerificationId('');
    setExpiresIn(0);
    setResendAfter(0);
    setRecovered(null);

    if (stored) {
      setPhone(formatPhoneForDisplay(stored.phone));
      setNormalizedPhone(stored.phone);
      setSavedAt(stored.verifiedAt);
      setStep('success');
      return;
    }

    setPhone('');
    setNormalizedPhone('');
    setSavedAt('');
    setStep('phone');
  }, [open]);

  useEffect(() => {
    if (!open || step !== 'code') return;
    if (expiresIn <= 0 && resendAfter <= 0) return;

    const timer = window.setTimeout(() => {
      setExpiresIn((current) => Math.max(0, current - 1));
      setResendAfter((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [expiresIn, open, resendAfter, step]);

  useEffect(() => {
    if (!open || step !== 'code') return;
    if (!canUseWebOtp()) return;

    const controller = new AbortController();

    (async () => {
      try {
        const credentialsApi = navigator.credentials as CredentialsContainer & {
          get?: (options?: CredentialRequestOptions & {
            otp?: { transport: string[] };
            signal?: AbortSignal;
          }) => Promise<{ code?: string } | null>;
        };

        const result = await credentialsApi.get?.({
          otp: { transport: ['sms'] },
          signal: controller.signal,
        });

        const codeFromSms = onlyDigits(result?.code ?? '');
        if (codeFromSms.length === 3) {
          setCode(codeFromSms);
        }
      } catch {
        // O usuário ainda pode digitar o código manualmente.
      }
    })();

    return () => controller.abort();
  }, [open, step]);

  useEffect(() => {
    if (!open || step !== 'code' || code.length !== 3) return;
    digitRefs.current[2]?.focus();
  }, [code, open, step]);

  const startPhoneVerification = async (event?: FormEvent) => {
    event?.preventDefault();
    const phoneToSend = normalizeBrazilianPhone(phone);

    if (!isValidBrazilianPhone(phoneToSend)) {
      setErrorMessage('Informe um telefone válido com DDD. O prefixo 55 é aceito.');
      return;
    }

    try {
      setIsStarting(true);
      setErrorMessage('');
      const response = await startRecovery(phoneToSend);
      setNormalizedPhone(phoneToSend);
      setPhone(formatPhoneForDisplay(phoneToSend));
      setVerificationId(response.verificationId);
      setExpiresIn(response.expiresInSeconds);
      setResendAfter(response.resendAfterSeconds);
      setCode('');
      setStep('code');
      window.requestAnimationFrame(() => digitRefs.current[0]?.focus());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível enviar o código.');
    } finally {
      setIsStarting(false);
    }
  };

  const confirmPhone = async () => {
    if (!canConfirm) return;

    try {
      setIsConfirming(true);
      setErrorMessage('');
      const response = await confirmRecovery(verificationId, code);
      saveRecoveredBookings(response.servicos);
      savePhoneVerification(normalizedPhone, response.servicos.length);
      onRecoveredBookings?.(response.servicos);
      setRecovered(response);
      setSavedAt(new Date().toISOString());
      setStep('success');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Código inválido.');
    } finally {
      setIsConfirming(false);
    }
  };

  const resendCode = async () => {
    if (!canResend) return;

    try {
      setIsResending(true);
      setErrorMessage('');
      const response = await resendRecovery(verificationId);
      setVerificationId(response.verificationId);
      setExpiresIn(response.expiresInSeconds);
      setResendAfter(response.resendAfterSeconds);
      setCode('');
      window.requestAnimationFrame(() => digitRefs.current[0]?.focus());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível reenviar o código.');
    } finally {
      setIsResending(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhoneForDisplay(value));
    setErrorMessage('');
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = onlyDigits(value).slice(-1);
    const next = [code[0] ?? '', code[1] ?? '', code[2] ?? ''];
    next[index] = digit;
    setCode(next.join('').slice(0, 3));
    setErrorMessage('');

    if (digit && index < 2) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Backspace') return;
    if (code[index]) return;
    digitRefs.current[index - 1]?.focus();
  };

  const handleCodePaste = (value: string) => {
    const pastedCode = onlyDigits(value);
    if (!pastedCode) return;
    setCode(pastedCode);
    digitRefs.current[Math.min(pastedCode.length, 3) - 1]?.focus();
  };

  const resetPhoneFlow = () => {
    setStep('phone');
    setCode('');
    setVerificationId('');
    setExpiresIn(0);
    setResendAfter(0);
    setRecovered(null);
    setErrorMessage('');
  };

  return (
    <div
      className={['home-mobile-profile-sheet', open ? 'home-mobile-profile-sheet--open' : '']
        .filter(Boolean)
        .join(' ')}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="home-mobile-profile-sheet__backdrop"
        onClick={onClose}
        aria-label="Fechar perfil"
      />

      <section className="home-mobile-profile-sheet__panel" role="dialog" aria-modal="true" aria-label="Perfil do usuário">
        <header className="home-mobile-profile-sheet__header">
          <div>
            <span>Perfil</span>
            <strong>Confirmar telefone</strong>
          </div>
          <button type="button" className="home-mobile-profile-sheet__close" onClick={onClose} aria-label="Fechar perfil">×</button>
        </header>

        <div className="home-mobile-profile-sheet__body">
          {step === 'phone' ? (
            <form className="home-mobile-profile-sheet__form" onSubmit={startPhoneVerification}>
              <label className="home-mobile-profile-sheet__field">
                <span>Confirme seu telefone</span>
                <input
                  value={phone}
                  onChange={(event) => handlePhoneChange(event.target.value)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(31) 99999-9999"
                />
              </label>
              <small className="home-mobile-profile-sheet__hint">Pode digitar com ou sem +55. O sistema salva a confirmação apenas neste navegador.</small>
              {errorMessage ? <p className="home-mobile-profile-sheet__error">{errorMessage}</p> : null}
              <button type="submit" className="home-mobile-profile-sheet__primary" disabled={isStarting}>
                {isStarting ? 'Enviando código...' : 'Confirmar número'}
              </button>
            </form>
          ) : null}

          {step === 'code' ? (
            <div className="home-mobile-profile-sheet__code-modal" role="dialog" aria-label="Código SMS">
              <div className="home-mobile-profile-sheet__code-header">
                <span>Código SMS</span>
                <strong>{confirmedPhoneLabel}</strong>
                <small>Expira em {expiresLabel}</small>
              </div>

              <div className="home-mobile-profile-sheet__otp" onPaste={(event) => {
                event.preventDefault();
                handleCodePaste(event.clipboardData.getData('text'));
              }}>
                {[0, 1, 2].map((index) => (
                  <input
                    key={index}
                    ref={(element) => { digitRefs.current[index] = element; }}
                    value={code[index] ?? ''}
                    onChange={(event) => handleDigitChange(index, event.target.value)}
                    onKeyDown={(event) => handleDigitKeyDown(index, event)}
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    aria-label={`Dígito ${index + 1} do código`}
                  />
                ))}
              </div>

              <small className="home-mobile-profile-sheet__hint">No Android/Chrome, o SMS pode preencher os 3 dígitos automaticamente.</small>
              {errorMessage ? <p className="home-mobile-profile-sheet__error">{errorMessage}</p> : null}

              <div className="home-mobile-profile-sheet__actions">
                <button type="button" className="home-mobile-profile-sheet__secondary" onClick={resetPhoneFlow}>Trocar telefone</button>
                <button type="button" className="home-mobile-profile-sheet__secondary" onClick={resendCode} disabled={!canResend}>
                  {isResending ? 'Reenviando...' : canResend ? 'Reenviar' : `Reenviar em ${resendAfter}s`}
                </button>
                <button type="button" className="home-mobile-profile-sheet__primary" onClick={confirmPhone} disabled={!canConfirm}>
                  {isConfirming ? 'Confirmando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          ) : null}

          {step === 'success' ? (
            <div className="home-mobile-profile-sheet__success">
              <div className="home-mobile-profile-sheet__success-icon" aria-hidden="true">✓</div>
              <strong>Telefone confirmado neste navegador</strong>
              <span>{confirmedPhoneLabel}</span>
              {savedAt ? <small>Confirmado em {formatSavedAt(savedAt)}</small> : null}
              <p>{formatRecoveredCount(recoveredCount)}</p>
              <div className="home-mobile-profile-sheet__actions home-mobile-profile-sheet__actions--stacked">
                {recoveredCount > 0 ? (
                  <button type="button" className="home-mobile-profile-sheet__primary" onClick={onOpenRecoveredBookings}>
                    Ver agendamentos
                  </button>
                ) : null}
                <button type="button" className="home-mobile-profile-sheet__secondary" onClick={resetPhoneFlow}>
                  Confirmar outro telefone
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
