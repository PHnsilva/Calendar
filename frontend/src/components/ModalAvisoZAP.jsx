import React from "react";
import "../styles/components/ModalAvisoZAP.css";
import Button from './Button';
import { buildBusinessWhatsAppUrl } from '../lib/support-contact';

const ModalAvisoZAP = ({ onClose }) => {
  const zapLink = buildBusinessWhatsAppUrl();

  return (
    <div className="modal-zap-overlay">
      <div className="modal-zap">
        <h3>Obrigado pela solicitação!</h3>
        <p>Já vamos te mandar uma mensagem. Mas se quiser, pode conversar com nosso prestador agora mesmo:</p>
        <Button as="a" href={zapLink} target="_blank" rel="noopener noreferrer" className="btn-zap-link">
          Falar com Gelson no WhatsApp 📲
        </Button>
        <Button className="btn-fechar-zap" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
};

export default ModalAvisoZAP;
