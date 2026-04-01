import { useNavigate } from "react-router-dom";
import "../styles/components/ModalNotificacoes.css";
import Button from './Button';
import Label from './Label';
import Input from './Input';

const ModalNotificacoes = ({ notificacoes, onClose }) => {
  const navigate = useNavigate();

  const formatarData = (dataIso) => {
    const data = new Date(dataIso);
    return data.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="modal-notificacoes-overlay">
      <div className="modal-notificacoes-content">
        <h3 className="modal-notificacoes-titulo">🔔 Suas notificações</h3>

        {notificacoes.length === 0 ? (
          <p className="modal-notificacoes-vazio">
            Nenhuma notificação recente.
          </p>
        ) : (
          <ul className="modal-notificacoes-lista">
            {notificacoes.map((n) => (
              <li key={n.id} className="modal-notificacoes-item">
                <strong>{n.titulo}</strong>
                <p>{n.mensagem}</p>
                <small>{formatarData(n.dataCriacao)}</small>
              </li>
            ))}
          </ul>
        )}

        <div className="modal-notificacoes-botoes">
          <Button className="btn-cancelar" onClick={onClose}>
            Fechar
          </Button>
          <Button
            className="btn-editar"
            onClick={() => {
              onClose();
              navigate("/notificacoes");
            }}
          >
            Ver todas
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModalNotificacoes;