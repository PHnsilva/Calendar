const defaultClientServiceOptions = [
  'Montagem',
  'Elétrica',
  'Hidráulica',
  'Instalações',
  'Pequenos reparos',
  'Serviços de pedreiro',
  'Pintura',
  'Jardinagem',
  'Filmagem de drone',
  'Outros',
] as const;

function toSafeText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}

function normalizeForComparison(value: unknown): string {
  const text = toSafeText(value);
  const decomposed = typeof text.normalize === 'function' ? text.normalize('NFD') : text;
  return decomposed
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function repairServiceEncoding(value: unknown): string {
  return toSafeText(value)
    .replace(/\u00c3\u00a0/g, 'à')
    .replace(/\u00c3\u00a1/g, 'á')
    .replace(/\u00c3\u00a2/g, 'â')
    .replace(/\u00c3\u00a3/g, 'ã')
    .replace(/\u00c3\u00a7/g, 'ç')
    .replace(/\u00c3\u00a8/g, 'è')
    .replace(/\u00c3\u00a9/g, 'é')
    .replace(/\u00c3\u00aa/g, 'ê')
    .replace(/\u00c3\u00ad/g, 'í')
    .replace(/\u00c3\u00b3/g, 'ó')
    .replace(/\u00c3\u00b4/g, 'ô')
    .replace(/\u00c3\u00b5/g, 'õ')
    .replace(/\u00c3\u00ba/g, 'ú')
    .replace(/\u00c2/g, '')
    .replace(/\bor[$\ufffd]amento(s?)\b/gi, (_match, plural: string) => `Orçamento${plural}`)
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeClientServiceLabel(value: unknown): string {
  const repaired = repairServiceEncoding(value);
  if (!repaired) return '';

  const normalized = normalizeForComparison(repaired);
  const aliases: Record<string, string> = {
    eletrica: 'Elétrica',
    hidraulica: 'Hidráulica',
    instalacoes: 'Instalações',
    'servico de pedreiro': 'Serviços de pedreiro',
    'servicos de pedreiro': 'Serviços de pedreiro',
    'servicos com drone': 'Filmagem de drone',
    'filmagem com drone': 'Filmagem de drone',
    'filmagem com drones': 'Filmagem de drone',
    'filmagem de drone': 'Filmagem de drone',
    orcamento: 'Outros',
    orcamentos: 'Outros',
    outro: 'Outros',
    outros: 'Outros',
  };

  return aliases[normalized] ?? repaired;
}

export function buildClientServiceOptions(rawServices: readonly unknown[] = [], currentService: unknown = ''): string[] {
  const normalizedCurrentService = normalizeClientServiceLabel(currentService);
  const options = [
    ...rawServices.map(normalizeClientServiceLabel),
    normalizedCurrentService,
    ...defaultClientServiceOptions,
  ].filter((service): service is string => Boolean(service));

  return [...new Set(options)];
}
