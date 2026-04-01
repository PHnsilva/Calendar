import React, { useEffect, useRef, useState } from "react";
import api from "../services/api"; 
import Button from "./Button";
import "../styles/components/EditUserModal.css";
import Button from './Button';
import Label from './Label';
import Input from './Input';

const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, "");
  digits = digits.replace(/^0+/, "");
  if (digits.startsWith("55")) {
    if (digits.length !== 13) return null;
    return `+${digits}`;
  }
  if (digits.length === 11) return `+55${digits}`;
  return null;
};

const EditUserModal = ({ user = {}, onClose = () => {}, onUpdated = () => {} }) => {
  const [form, setForm] = useState({
    nome: user.nome ?? "",
    telefone: user.telefone ?? "",
  });
  const [origTelefone] = useState(user.telefone ?? "");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const overlayRef = useRef(null);

  // Detecta mudanças de nome ou telefone
  const nomeAlterado = form.nome !== user.nome;
  const telefoneAlterado = (form.telefone || "").replace(/\D/g, "") !== (origTelefone || "").replace(/\D/g, "");
  const precisaCodigo = nomeAlterado || telefoneAlterado;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Reseta o código se nada mudou
  useEffect(() => {
    if (!precisaCodigo) {
      setCodeSent(false);
      setVerificationCode("");
    }
  }, [precisaCodigo]);

  const onOverlayClick = (e) => { if (e.target === overlayRef.current) onClose(); };

  const handleChange = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    setError("");
    setInfoMsg("");
  };

  const sendSmsCode = async () => {
    setError("");
    setInfoMsg("");
    const telefoneFormatado = formatPhoneNumber(form.telefone);
    if (!telefoneFormatado) {
      setError("Número inválido. Digite 11 dígitos (DDD + número) ou +55...");
      return;
    }
    setIsSendingCode(true);
    try {
      await api.post("/notificacao/send-sms", null, { params: { telefone: telefoneFormatado } });
      setCodeSent(true);
      setInfoMsg(`Código enviado para ${telefoneFormatado}. Informe o código abaixo para confirmar a alteração de nome ou telefone.`);
    } catch (err) {
      console.error("Erro ao enviar SMS:", err);
      setError("Falha ao enviar SMS. Verifique o número e tente novamente.");
    } finally { setIsSendingCode(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMsg("");

    if (!form.nome || form.nome.trim().length < 2) {
      setError("Informe um nome válido.");
      return;
    }

    const telefoneFormatado = formatPhoneNumber(form.telefone);

    if (telefoneAlterado && !telefoneFormatado) {
      setError("Número de telefone inválido.");
      return;
    }

    if (precisaCodigo && !codeSent) {
      const ok = window.confirm(
        "Você alterou o nome ou telefone mas ainda não pediu o código de verificação. Deseja enviar o código agora?"
      );
      if (!ok) return;
      await sendSmsCode();
      return;
    }

    if (precisaCodigo && codeSent && !verificationCode) {
      setError("Informe o código de verificação enviado por SMS antes de salvar.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        nome: form.nome,
        username: form.nome,
        telefone: telefoneFormatado ?? form.telefone,
      };
      const params = precisaCodigo ? { code: verificationCode } : {};
      const { data } = await api.put("/usuarios/perfil", payload, { params });

      setInfoMsg("Dados atualizados com sucesso.");
      onUpdated(data); // envia os dados atualizados para o pai atualizar a UI sem F5
      setTimeout(() => onClose(), 900);
    } catch (err) {
      console.error("Erro ao salvar usuário:", err);
      const msg = err?.response?.data ?? "";
      if (typeof msg === "string" && msg.includes("Telefone já cadastrado")) {
        setError("Este telefone já está em uso por outro usuário.");
      } else if (typeof msg === "string" && msg.includes("Código inválido")) {
        setError("Código de verificação inválido. Peça um novo código.");
      } else {
        setError("Falha ao salvar. Tente novamente.");
      }
    } finally { setIsSaving(false); }
  };

  return (
    <div
      className="edit-user-modal-overlay"
      ref={overlayRef}
      onMouseDown={onOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Editar usuário"
    >
      <div className="edit-user-modal-content" role="document">
        <header className="edit-user-modal-header">
          <h3>Editar informações</h3>
          <Button className="edit-user-modal-close" onClick={onClose} aria-label="Fechar">✕</Button>
        </header>

        <form className="edit-user-form" onSubmit={handleSave}>
          <Label className="field-label">
            Nome
            <Input
              type="text"
              value={form.nome}
              onChange={handleChange("nome")}
              placeholder="Seu nome completo"
              required
             />
          </Label>

          <Label className="field-label">
            Telefone
            <Input
              type="tel"
              value={form.telefone}
              onChange={handleChange("telefone")}
              placeholder="11999998888 ou +5511999998888"
             />
          </Label>

          {precisaCodigo && (
            <div className="sms-block">
              {!codeSent ? (
                <>
                  <p className="sms-note">
                    Para confirmar a alteração de nome ou telefone será enviado um código por SMS. Clique em
                    <strong> Enviar código</strong>.
                  </p>
                  <div className="sms-actions">
                    <Button type="button" variant="default" onClick={sendSmsCode} disabled={isSendingCode}>
                      {isSendingCode ? "Enviando..." : "Enviar código"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="sms-note">
                    Código enviado. Informe o código abaixo e clique em <strong>Salvar</strong>.
                  </p>
                  <Label className="field-label">
                    Código de Verificação
                    <Input
                      type="text"
                      value={verificationCode}
                      onChange={(e) = /> setVerificationCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="Digite o código recebido por SMS"
                    />
                  </Label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button type="button" variant="outline" onClick={sendSmsCode} disabled={isSendingCode}>
                      {isSendingCode ? "Reenviando..." : "Reenviar código"}
                    </Button>
                    <div style={{ flex: 1 }} />
                  </div>
                </>
              )}
            </div>
          )}

          {error && <div className="edit-user-error">{error}</div>}
          {infoMsg && <div className="edit-user-info">{infoMsg}</div>}

          <div className="edit-user-actions">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;