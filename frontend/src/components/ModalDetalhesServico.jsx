import { useEffect, useState } from 'react';
import { getUserProfile } from '../services/authService';
import '../styles/components/ModalDetalhesServico.css';
import Button from './Button';
import Label from './Label';
import Input from './Input';

const ModalDetalhesServico = ({ servico, onClose }) => {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getUserProfile();
        setUsuario(res);
      } catch (error) {
        console.error("Erro ao buscar perfil do usuário:", error);
      }
    })();
  }, []);

  const formatarData = (isoDate) => {
    if (!isoDate) return "Não especificada";

    // se vier só no formato YYYY-MM-DD, tratar manualmente
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      const [ano, mes, dia] = isoDate.split("-").map(Number);
      return `${dia.toString().padStart(2, "0")}/${mes.toString().padStart(2, "0")}/${ano}`;
    }

    // senão, tenta como ISO completo
    const d = new Date(isoDate);
    if (isNaN(d)) return isoDate; // fallback
    return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  };

  const formatarHorario = (horario) =>
    horario ? horario.slice(0, 5) : 'Não especificado';

  return (
    <div className="modal-detalhes-overlay">
      <div className="modal-detalhes-content">
        {/* Título principal = nome do serviço */}
        <h2 className="modal-detalhes-titulo">{servico.nome}</h2>

        {/* Layout em duas colunas */}
        <div className="modal-detalhes-grid">
          {/* Coluna Esquerda → cliente/prestador/contato */}
          <div className="modal-detalhes-col">
            <p><strong>Status:</strong> {servico.status}</p>
            <p><strong>Telefone de Contato:</strong> {servico.telefoneContato}</p>

            {servico.status === 'CANCELADO' && (
              <p><strong>Motivo do Cancelamento:</strong> {servico.motivoCancelamento}</p>
            )}

            {usuario?.tipo === 'CLIENTE' && (
              <p><strong>Prestador:</strong> {servico.administradorNome || 'Não definido'}</p>
            )}

            {usuario?.tipo === 'ADMIN' && (
              <p><strong>Cliente:</strong> {servico.clienteNome}</p>
            )}
          </div>

          {/* Coluna Direita → datas e horários */}
          <div className="modal-detalhes-col">
            <p><strong>Data Agendada:</strong> {formatarData(servico.diaEspecifico)}</p>
            <p><strong>Horário:</strong> {formatarHorario(servico.horario)}</p>
          </div>
        </div>

        {/* Botão */}
        <div className="modal-detalhes-botoes">
          <Button variant="cancelar" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
};

export default ModalDetalhesServico;