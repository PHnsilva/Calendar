import type { ServicoResponse } from '../../../types/api';

function pad(value: number) {
  return `${value}`.padStart(2, '0');
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toIsoDateTime(date: Date, time: string) {
  return `${toIsoDate(date)}T${time}:00`;
}

function buildBooking(date: Date, time: string, serviceType: string, city: string, firstName: string, lastName: string, street: string, number: string, id: string): ServicoResponse {
  const [hours, minutes] = time.split(':').map(Number);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours + 1, minutes, 0);

  return {
    eventId: id,
    eventLink: '',
    serviceType,
    start: toIsoDateTime(date, time),
    end: `${toIsoDate(end)}T${pad(end.getHours())}:${pad(end.getMinutes())}:00`,
    clientFirstName: firstName,
    clientLastName: lastName,
    clientEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@exemplo.com`,
    clientPhone: '(31) 98888-0000',
    clientCep: '35450-000',
    clientStreet: street,
    clientNeighborhood: 'Centro',
    clientNumber: number,
    clientComplement: '',
    clientCity: city,
    clientState: 'MG',
    clientAddressLine: `${street}, ${number} - ${city}/MG`,
    status: 'CONFIRMED',
  };
}

export function buildAdminMockBookings(anchor = new Date()): ServicoResponse[] {
  const base = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const future = [
    { day: 4, time: '08:00', name: ['Eduarda', 'Torres'], city: 'Moeda', service: 'Vistoria técnica', street: 'Rua das Flores', number: '102' },
    { day: 11, time: '11:00', name: ['Fernanda', 'Lima'], city: 'Ouro Preto', service: 'Instalação', street: 'Rua Direita', number: '103' },
    { day: 15, time: '15:00', name: ['João', 'Pedro'], city: 'Itabirito', service: 'Manutenção', street: 'Av. Queiroz Júnior', number: '104' },
    { day: 18, time: '08:00', name: ['Lucas', 'Oliveira'], city: 'Itabirito', service: 'Preventiva', street: 'Rua Barão de Itabirito', number: '55' },
    { day: 22, time: '13:00', name: ['Marina', 'Costa'], city: 'Moeda', service: 'Vistoria técnica', street: 'Rua da Matriz', number: '77' },
    { day: 25, time: '09:00', name: ['Roberta', 'Silva'], city: 'Ouro Preto', service: 'Instalação', street: 'Rua Direita', number: '210' },
  ];

  const past = [
    { offsetMonth: -1, day: 9, time: '09:00', name: ['Carlos', 'Martins'], city: 'Itabirito', service: 'Instalação', street: 'Rua Felipe Camarão', number: '101' },
    { offsetMonth: -1, day: 11, time: '10:00', name: ['Eduarda', 'Torres'], city: 'Ouro Preto', service: 'Manutenção', street: 'Rua Direita', number: '102' },
    { offsetMonth: -1, day: 15, time: '11:00', name: ['Fernanda', 'Lima'], city: 'Moeda', service: 'Preventiva', street: 'Rua das Flores', number: '103' },
    { offsetMonth: -1, day: 17, time: '14:00', name: ['Lucas', 'Oliveira'], city: 'Ouro Preto', service: 'Visita técnica', street: 'Rua São José', number: '201' },
    { offsetMonth: -1, day: 25, time: '08:00', name: ['João', 'Pedro'], city: 'Moeda', service: 'Instalação', street: 'Rua das Flores', number: '19' },
  ];

  const bookings: ServicoResponse[] = [];

  future.forEach((entry, index) => {
    const date = new Date(base.getFullYear(), base.getMonth(), entry.day);
    bookings.push(buildBooking(date, entry.time, entry.service, entry.city, entry.name[0], entry.name[1], entry.street, entry.number, `mock-future-${index}`));
  });

  past.forEach((entry, index) => {
    const date = new Date(base.getFullYear(), base.getMonth() + entry.offsetMonth, entry.day);
    bookings.push(buildBooking(date, entry.time, entry.service, entry.city, entry.name[0], entry.name[1], entry.street, entry.number, `mock-past-${index}`));
  });

  return bookings.sort((left, right) => left.start.localeCompare(right.start));
}
