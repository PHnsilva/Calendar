import { CalendarMateModal, type ModalKind } from "../../../components/screens/CalendarMateRoutes";
import { AppProviders } from "../../../app/providers";

type DeferredCalendarMateModalProps = {
  modal: ModalKind;
  onClose: () => void;
  onOpenModal: (modal: ModalKind) => void;
};

export default function DeferredCalendarMateModal(props: DeferredCalendarMateModalProps) {
  return <AppProviders><CalendarMateModal {...props} /></AppProviders>;
}
