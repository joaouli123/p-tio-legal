import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';

type PlateLookupPayload = {
  marcaModelo: string;
  ano?: string;
  cor?: string;
  chassi?: string;
  tipo?: 'automovel' | 'motocicleta' | 'caminhao' | 'van_utilitario' | 'onibus' | 'outro';
  municipio?: string;
  uf?: string;
};

type PlateLookupResult =
  | { kind: 'found'; data: PlateLookupPayload; source: 'apiplacas' }
  | { kind: 'not_found'; message: string }
  | { kind: 'unavailable'; message: string }
  | { kind: 'error'; message: string };

const LOOKUP_WINDOW_MS = 60_000;
const LOOKUP_MAX_REQUESTS = 30;
const lookupRateLimit = new Map<string, { count: number; resetAt: number }>();

function allowLookupRequest(request: Request) {
  const now = Date.now();
  if (lookupRateLimit.size > 5_000) {
    for (const [staleKey, staleEntry] of lookupRateLimit) {
      if (staleEntry.resetAt <= now) lookupRateLimit.delete(staleKey);
    }
  }
  const key = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown-client';
  const current = lookupRateLimit.get(key);

  if (!current || current.resetAt <= now) {
    lookupRateLimit.set(key, { count: 1, resetAt: now + LOOKUP_WINDOW_MS });
    return true;
  }

  if (current.count >= LOOKUP_MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

function normalizePlate(value: string) {
  return value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

function pickString(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function pickNestedString(payload: Record<string, unknown>, parentKeys: string[], childKeys: string[]) {
  for (const parentKey of parentKeys) {
    const nested = payload[parentKey];
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
      continue;
    }

    const value = pickString(nested as Record<string, unknown>, childKeys);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function titleCase(value?: string) {
  if (!value) return undefined;
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mapTipo(raw?: string): PlateLookupPayload['tipo'] {
  const text = raw?.toLowerCase() ?? '';
  if (!text) return undefined;
  if (text.includes('moto')) return 'motocicleta';
  if (text.includes('caminh')) return 'caminhao';
  if (text.includes('nibus')) return 'onibus';
  if (text.includes('van') || text.includes('utili')) return 'van_utilitario';
  if (text.includes('car') || text.includes('passeio') || text.includes('autom')) return 'automovel';
  return 'outro';
}

function getLookupMessage(payload: Record<string, unknown> | null, fallback: string) {
  if (!payload) {
    return fallback;
  }

  return pickString(payload, ['message', 'mensagemRetorno']) ?? fallback;
}

function toLookupPayload(payload: Record<string, unknown>): PlateLookupPayload | null {
  const marca = pickString(payload, ['MARCA', 'marca']);
  const modelo = pickString(payload, ['MODELO', 'modelo']);
  const marcaModelo = [marca, modelo].filter(Boolean).join(' / ') || pickString(payload, ['marcaModelo']);
  if (!marcaModelo) return null;

  const ano = pickString(payload, ['ano', 'ANO']);
  const anoModelo = pickString(payload, ['anoModelo', 'ANO_MODELO', 'ano_modelo']);
  const cor = titleCase(pickString(payload, ['cor', 'COR']));
  const chassi = pickString(payload, ['chassi', 'CHASSI']);
  const tipo = mapTipo(
    pickString(payload, ['TIPO', 'tipo', 'tipoVeiculo', 'tipo_veiculo'])
      ?? pickNestedString(payload, ['extra'], ['tipo_veiculo', 'tipoVeiculo', 'segmento']),
  );
  const municipio = titleCase(
    pickString(payload, ['municipio', 'MUNICIPIO', 'cidade', 'CIDADE'])
      ?? pickNestedString(payload, ['extra'], ['municipio', 'cidade']),
  );
  const uf = pickString(payload, ['uf', 'UF']) ?? pickNestedString(payload, ['extra'], ['uf', 'uf_placa']);

  return {
    marcaModelo,
    ...(ano ? { ano: anoModelo && anoModelo !== ano ? `${ano}/${anoModelo}` : ano } : {}),
    ...(cor ? { cor } : {}),
    ...(chassi && !chassi.includes('*') ? { chassi: chassi.toUpperCase() } : {}),
    ...(tipo ? { tipo } : {}),
    ...(municipio ? { municipio } : {}),
    ...(uf ? { uf } : {}),
  };
}

async function lookupWithApiPlacas(plate: string, token: string): Promise<PlateLookupResult> {
  // API Placas currently documents the WDAPI2 host for plate lookups.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  let response: Response;
  try {
    response = await fetch(`https://wdapi2.com.br/consulta/${plate}/${token}`, {
      headers: {
        'User-Agent': 'PatioLegal/1.0',
        Accept: 'application/json,text/plain,*/*',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const rawBody = await response.text();
  const payload = response.headers.get('content-type')?.includes('application/json')
    ? (JSON.parse(rawBody) as Record<string, unknown>)
    : null;

  if (response.status === 404 || response.status === 406) {
    return {
      kind: 'not_found',
      message: getLookupMessage(payload, 'Nenhum dado encontrado para a placa.'),
    };
  }

  if (response.status === 402) {
    return {
      kind: 'unavailable',
      message: 'Token da API Placas inválido. Confira o crédito e a variável APIPLACAS_TOKEN no servidor.',
    };
  }

  if (response.status === 429) {
    return {
      kind: 'unavailable',
      message: 'Limite de consultas da API Placas atingido.',
    };
  }

  if (!response.ok) {
    return {
      kind: 'error',
      message: getLookupMessage(payload, rawBody || `API Placas respondeu ${response.status}`),
    };
  }

  if (!payload) {
    return {
      kind: 'error',
      message: 'A API Placas retornou uma resposta inválida.',
    };
  }

  const data = toLookupPayload(payload);
  if (!data) {
    return {
      kind: 'not_found',
      message: getLookupMessage(payload, 'Nenhum dado encontrado para a placa.'),
    };
  }

  return { kind: 'found', data, source: 'apiplacas' };
}

function getSupabaseEnv() {
  const url = process.env.VITE_SUPABASE_URL
    ?? process.env.SUPABASE_URL
    ?? (import.meta.env?.VITE_SUPABASE_URL as string | undefined);
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? (import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined);
  return { url, anonKey };
}

async function isAuthenticatedRequest(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('Authorization') ?? request.headers.get('authorization');
  const token = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (!token) return false;

  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    // Without server credentials we cannot validate the session; fail closed.
    return false;
  }

  try {
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(token);
    return !error && !!data.user;
  } catch {
    return false;
  }
}

export const Route = createFileRoute('/api/plate-lookup')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authenticated = await isAuthenticatedRequest(request);
        if (!authenticated) {
          return Response.json(
            { status: 'error', message: 'Sessão inválida ou expirada. Faça login novamente.' },
            { status: 401 },
          );
        }

        if (!allowLookupRequest(request)) {
          return Response.json(
            { status: 'error', message: 'Limite de consultas temporariamente atingido. Tente novamente em instantes.' },
            { status: 429, headers: { 'Retry-After': '60' } },
          );
        }

        const url = new URL(request.url);
        const plate = normalizePlate(url.searchParams.get('plate') ?? '');

        if (plate.length < 7) {
          return Response.json({ status: 'error', message: 'Placa inválida.' }, { status: 400 });
        }

        const apiPlacasToken = process.env.APIPLACAS_TOKEN || process.env.WDAPI2_TOKEN || process.env.VITE_WDAPI_TOKEN;
        if (!apiPlacasToken) {
          return Response.json(
            {
              status: 'unavailable',
              message: 'Consulta de placa indisponível. Configure APIPLACAS_TOKEN no servidor.',
            },
            { status: 503 },
          );
        }

        try {
          const result = await lookupWithApiPlacas(plate, apiPlacasToken);

          if (result.kind === 'found') {
            return Response.json({
              status: 'found',
              source: result.source,
              data: result.data,
            });
          }

          if (result.kind === 'not_found') {
            return Response.json({ status: 'not_found', message: result.message }, { status: 404 });
          }

          if (result.kind === 'unavailable') {
            return Response.json({ status: 'unavailable', message: result.message }, { status: 503 });
          }

          return Response.json({ status: 'error', message: result.message }, { status: 502 });
        } catch (error) {
          console.error('plate lookup failed', error);
          return Response.json(
            {
              status: 'error',
              message: 'Falha ao consultar a placa em fontes externas.',
            },
            { status: 502 },
          );
        }
      },
    },
  },
});
