import { supabase } from './supabase';
import {
  buildPlateMetadataPayload,
  normalizeVehiclePlateRecord,
  type PlateStatus,
} from './plate-status';

export type VehicleStatus = 'no_patio' | 'em_analise' | 'destruido' | 'restituido' | 'leilao' | 'doacao' | 'aguardando';
export type VehicleType = 'automovel' | 'motocicleta' | 'caminhao' | 'van_utilitario' | 'onibus' | 'outro';
export type VehicleCondition = 'integro' | 'sinistrado' | 'queimado' | 'sucata' | 'descaracterizado';
export type UserRole = 'admin' | 'delegado';
export type EffectiveUserRole = 'admin' | 'delegado';
export type AccessScopeType = 'delegacia' | 'cidade' | 'tipo';

export interface AccessScope {
  type: AccessScopeType;
  value: string;
  label: string;
}

export interface Veiculo {
  id: string;
  placa: string;
  placa_oficial?: string;
  status_placa?: PlateStatus;
  chassi?: string;
  marca_modelo: string;
  ano?: string;
  cor?: string;
  tipo: VehicleType;
  tipo_consulta?: string;
  situacao: VehicleCondition;
  marca_modelo_consulta?: string;
  ano_consulta?: string;
  cor_consulta?: string;
  status: VehicleStatus;
  delegacia_nome?: string;
  processo?: string;
  setor?: string;
  local_vaga?: string;
  observacoes?: string;
  registrado_por?: string;
  created_at: string;
  updated_at: string;
}

export type ObjetoTipo = 'caca_niquel' | 'outro';
export type ObjetoStatus = 'apreendido' | 'em_analise' | 'aguardando' | 'destruido' | 'restituido';

export interface Objeto {
  id: string;
  tipo: ObjetoTipo;
  descricao: string;
  marca_modelo?: string;
  numero_serie?: string;
  quantidade: number;
  unidade: string;
  origem?: string;
  situacao?: string;
  status: ObjetoStatus;
  delegacia_nome?: string;
  processo?: string;
  setor?: string;
  local_vaga?: string;
  observacoes?: string;
  registrado_por?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  nome: string;
  cargo: UserRole;
  delegacia?: string;
  escopo_tipo?: AccessScopeType | null;
  escopo_valor?: string | null;
  matricula?: string;
  ativo: boolean;
  avatar_url?: string | null;
  notificacoes_push_habilitadas?: boolean;
  biometria_habilitada?: boolean;
  created_at: string;
}

export interface Destruicao {
  id: string;
  veiculo_id?: string;
  objeto_id?: string;
  metodo: string;
  operador_nome?: string;
  finalizado: boolean;
  finalizado_em?: string;
  created_at: string;
}

export interface Laudo {
  id: string;
  numero: string;
  veiculo_id?: string;
  objeto_id?: string;
  destruicao_id?: string;
  responsavel_nome?: string;
  emitido_em: string;
  hash_sha256?: string;
  created_at: string;
}

export interface HistoricoItem {
  id: string;
  veiculo_id?: string;
  objeto_id?: string;
  tipo: string;
  titulo: string;
  detalhe?: string;
  usuario_nome?: string;
  created_at: string;
}

function isMissingOptionalColumnError(error: { message?: string; details?: string; hint?: string } | null, columnName: string) {
  const text = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();

  return text.includes(columnName.toUpperCase()) && (text.includes('COLUMN') || text.includes('SCHEMA CACHE'));
}

function omitOptionalColumn<T extends Record<string, unknown>>(payload: T, columnName: string) {
  const clone: Record<string, unknown> = { ...payload };
  delete clone[columnName];
  return clone as T;
}

const OPTIONAL_VEHICLE_COLUMNS = [
  'setor',
  'placa_oficial',
  'status_placa',
  'marca_modelo_consulta',
  'ano_consulta',
  'cor_consulta',
  'tipo_consulta',
] as const;

function normalizeVeiculoRecord(record: Veiculo) {
  return normalizeVehiclePlateRecord(record);
}

function prepareVeiculoPayload<T extends Partial<Veiculo>>(payload: T) {
  return buildPlateMetadataPayload(payload);
}

function removeMissingOptionalVehicleColumn<T extends Record<string, unknown>>(payload: T, error: { message?: string; details?: string; hint?: string } | null) {
  for (const columnName of OPTIONAL_VEHICLE_COLUMNS) {
    if (payload[columnName] !== undefined && isMissingOptionalColumnError(error, columnName)) {
      return omitOptionalColumn(payload, columnName);
    }
  }
  return null;
}

const SCOPE_LABELS: Record<AccessScopeType, string> = {
  delegacia: 'Delegacia',
  cidade: 'Cidade',
  tipo: 'Tipo de unidade',
};

const EFFECTIVE_ROLE_LABELS: Record<EffectiveUserRole, string> = {
  admin: 'Administrador',
  delegado: 'Delegado',
};

export function normalizeUserRole(role?: UserRole | null): EffectiveUserRole {
  return role === 'admin' ? 'admin' : 'delegado';
}

export function canAccessAdminArea(role?: UserRole | null) {
  return normalizeUserRole(role) === 'admin';
}

export function getUserRoleLabel(role?: UserRole | null) {
  return EFFECTIVE_ROLE_LABELS[normalizeUserRole(role)];
}

function normalizeScopeValue(value?: string | null) {
  return value?.trim() ?? '';
}

export function getProfileAccessScope(profile: Pick<Profile, 'cargo' | 'delegacia' | 'escopo_tipo' | 'escopo_valor'> | null | undefined): AccessScope | null {
  if (!profile || profile.cargo === 'admin') return null;

  const scopeType = profile.escopo_tipo ?? (profile.delegacia ? 'delegacia' : null);
  const scopeValue = normalizeScopeValue(profile.escopo_valor ?? profile.delegacia);

  if (!scopeType || !scopeValue) return null;

  return {
    type: scopeType,
    value: scopeValue,
    label: SCOPE_LABELS[scopeType],
  };
}

export function formatProfileAccessLabel(profile: Pick<Profile, 'cargo' | 'delegacia' | 'escopo_tipo' | 'escopo_valor'> | null | undefined) {
  const scope = getProfileAccessScope(profile);
  return scope ? `${scope.label}: ${scope.value}` : null;
}

async function resolveScopedDelegacias(scope: AccessScope | null) {
  if (!scope) return null;
  if (scope.type === 'delegacia') return [scope.value];

  const field = scope.type === 'cidade' ? 'cidade' : 'tipo';
  const { data, error } = await supabase
    .from('delegacias')
    .select('nome')
    .eq(field, scope.value)
    .eq('ativo', true)
    .order('nome');

  if (error) throw error;
  return (data ?? []).map((item: { nome: string }) => item.nome);
}

async function getCurrentAccessScope() {
  const profile = await getCurrentProfile();
  return getProfileAccessScope(profile);
}

function isWithinDelegaciaScope(delegaciaNome: string | null | undefined, allowedDelegacias: string[] | null) {
  if (!allowedDelegacias) return true;
  return !!delegaciaNome && allowedDelegacias.includes(delegaciaNome);
}

function getNestedDelegaciaName(record: { delegacia_nome?: string | null; veiculos?: { delegacia_nome?: string | null } | Array<{ delegacia_nome?: string | null }> | null }) {
  if (record.delegacia_nome) return record.delegacia_nome;
  if (Array.isArray(record.veiculos)) return record.veiculos[0]?.delegacia_nome ?? null;
  return record.veiculos?.delegacia_nome ?? null;
}

async function assertDelegaciaAccess(delegaciaNome: string | null | undefined) {
  const scope = await getCurrentAccessScope();
  const allowedDelegacias = await resolveScopedDelegacias(scope);

  if (!isWithinDelegaciaScope(delegaciaNome, allowedDelegacias)) {
    throw new Error('Acesso restrito ao escopo da unidade vinculada ao usuário.');
  }
}

async function getScopedVehicleRecord(id: string) {
  const { data, error } = await supabase
    .from('veiculos')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Veículo não encontrado.');

  await assertDelegaciaAccess((data as Veiculo).delegacia_nome);
  return data as Veiculo;
}

async function getScopedObjetoRecord(id: string) {
  const { data, error } = await supabase
    .from('objetos')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Objeto não encontrado.');

  await assertDelegaciaAccess((data as Objeto).delegacia_nome);
  return data as Objeto;
}

function isProfileVisible(profile: Profile, currentScope: AccessScope | null, allowedDelegacias: string[] | null, currentProfileId?: string) {
  if (!currentScope) return true;
  if (profile.id === currentProfileId) return true;

  const profileScope = getProfileAccessScope(profile);
  if (!profileScope) return false;

  if (currentScope.type === 'delegacia') {
    return profileScope.type === 'delegacia' && profileScope.value === currentScope.value;
  }

  if (profileScope.type === currentScope.type && profileScope.value === currentScope.value) {
    return true;
  }

  return profileScope.type === 'delegacia' && isWithinDelegaciaScope(profileScope.value, allowedDelegacias);
}

// ── Veículos ─────────────────────────────────────────────────

// Columns needed by the list views + plate-status normalization + detail
// navigation. Kept explicit (instead of `*`) so list queries only transfer the
// fields the tables actually render. The single-record `getVeiculo` still uses
// `*` for the full detail view.
const VEHICLE_LIST_COLUMNS = [
  'id', 'placa', 'placa_oficial', 'status_placa',
  'chassi', 'marca_modelo', 'marca_modelo_consulta',
  'ano', 'ano_consulta', 'cor', 'cor_consulta',
  'tipo', 'tipo_consulta', 'situacao', 'status',
  'delegacia_nome', 'processo', 'setor', 'local_vaga',
  'observacoes', 'registrado_por', 'created_at', 'updated_at',
].join(', ');

/**
 * List vehicles in scope. Optional `pagination` ({ limit, offset }) is available
 * for large deployments; when omitted the full scoped list is returned (current
 * behaviour). The explicit column list above keeps the payload lean.
 */
export async function getVeiculos(status?: VehicleStatus, pagination?: { limit?: number; offset?: number }) {
  const scope = await getCurrentAccessScope();
  const allowedDelegacias = await resolveScopedDelegacias(scope);

  if (allowedDelegacias && allowedDelegacias.length === 0) {
    return [] as Veiculo[];
  }

  let query = supabase
    .from('veiculos')
    .select(VEHICLE_LIST_COLUMNS)
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (allowedDelegacias) query = query.in('delegacia_nome', allowedDelegacias);
  if (pagination) {
    const offset = pagination.offset ?? 0;
    if (pagination.limit != null) {
      query = query.range(offset, offset + pagination.limit - 1);
    } else if (offset > 0) {
      query = query.range(offset, offset + 999);
    }
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as Veiculo[]).map(normalizeVeiculoRecord);
}

export async function getVeiculo(id: string) {
  return normalizeVeiculoRecord(await getScopedVehicleRecord(id));
}

export async function createVeiculo(veiculo: Omit<Veiculo, 'id' | 'created_at' | 'updated_at'>) {
  await assertDelegaciaAccess(veiculo.delegacia_nome);

  let payload = prepareVeiculoPayload(veiculo);

  while (true) {
    let { data, error } = await supabase
      .from('veiculos')
      .insert(payload)
      .select()
      .single();

    if (!error) {
      return normalizeVeiculoRecord(data as Veiculo);
    }

    const fallbackPayload = removeMissingOptionalVehicleColumn(payload, error);
    if (!fallbackPayload) {
      throw error;
    }

    payload = fallbackPayload;
  }
}

export async function updateVeiculo(id: string, updates: Partial<Veiculo>) {
  await getScopedVehicleRecord(id);
  if (updates.delegacia_nome !== undefined) await assertDelegaciaAccess(updates.delegacia_nome);

  let payload = prepareVeiculoPayload(updates);

  while (true) {
    let { data, error } = await supabase
      .from('veiculos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (!error) {
      return normalizeVeiculoRecord(data as Veiculo);
    }

    const fallbackPayload = removeMissingOptionalVehicleColumn(payload, error);
    if (!fallbackPayload) {
      throw error;
    }

    payload = fallbackPayload;
  }
}

export async function getVeiculoStats() {
  const scope = await getCurrentAccessScope();
  const allowedDelegacias = await resolveScopedDelegacias(scope);

  if (allowedDelegacias && allowedDelegacias.length === 0) {
    return { no_patio: 0, em_analise: 0, destruido: 0, restituido: 0, leilao: 0, doacao: 0, aguardando: 0, total: 0 };
  }

  let query = supabase
    .from('veiculos')
    .select('status');

  if (allowedDelegacias) query = query.in('delegacia_nome', allowedDelegacias);

  const { data, error } = await query;
  if (error) throw error;
  const stats = { no_patio: 0, em_analise: 0, destruido: 0, restituido: 0, leilao: 0, doacao: 0, aguardando: 0, total: 0 };
  (data as { status: VehicleStatus }[]).forEach(v => {
    stats[v.status]++;
    stats.total++;
  });
  return stats;
}

// ── Objetos ──────────────────────────────────────────────────

export async function getObjetos(status?: ObjetoStatus) {
  const scope = await getCurrentAccessScope();
  const allowedDelegacias = await resolveScopedDelegacias(scope);

  if (allowedDelegacias && allowedDelegacias.length === 0) {
    return [] as Objeto[];
  }

  let query = supabase
    .from('objetos')
    .select('*')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (allowedDelegacias) query = query.in('delegacia_nome', allowedDelegacias);
  const { data, error } = await query;
  if (error) throw error;
  return data as Objeto[];
}

export async function getObjeto(id: string) {
  return getScopedObjetoRecord(id);
}

export async function createObjeto(objeto: Omit<Objeto, 'id' | 'created_at' | 'updated_at'>) {
  await assertDelegaciaAccess(objeto.delegacia_nome);

  const { data, error } = await supabase
    .from('objetos')
    .insert(objeto)
    .select()
    .single();
  if (error) throw error;
  return data as Objeto;
}

export async function updateObjeto(id: string, updates: Partial<Objeto>) {
  await getScopedObjetoRecord(id);
  if (updates.delegacia_nome !== undefined) await assertDelegaciaAccess(updates.delegacia_nome);

  const { data, error } = await supabase
    .from('objetos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Objeto;
}

export async function getObjetoStats() {
  const scope = await getCurrentAccessScope();
  const allowedDelegacias = await resolveScopedDelegacias(scope);

  if (allowedDelegacias && allowedDelegacias.length === 0) {
    return { apreendido: 0, em_analise: 0, aguardando: 0, destruido: 0, restituido: 0, total: 0 };
  }

  let query = supabase
    .from('objetos')
    .select('status');

  if (allowedDelegacias) query = query.in('delegacia_nome', allowedDelegacias);

  const { data, error } = await query;
  if (error) throw error;
  const stats = { apreendido: 0, em_analise: 0, aguardando: 0, destruido: 0, restituido: 0, total: 0 };
  (data as { status: ObjetoStatus }[]).forEach(o => {
    stats[o.status]++;
    stats.total++;
  });
  return stats;
}

// ── Destruições / Laudos / Histórico de objetos ──────────────

export async function getDestruicoesObjeto() {
  const scope = await getCurrentAccessScope();
  const allowedDelegacias = await resolveScopedDelegacias(scope);

  if (allowedDelegacias && allowedDelegacias.length === 0) return [];

  const joinSelect = allowedDelegacias
    ? '*, objetos!inner(descricao, marca_modelo, delegacia_nome)'
    : '*, objetos(descricao, marca_modelo, delegacia_nome)';

  let query = supabase
    .from('destruicoes')
    .select(joinSelect)
    .not('objeto_id', 'is', null)
    .order('created_at', { ascending: false });
  if (allowedDelegacias) query = query.in('objetos.delegacia_nome', allowedDelegacias);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createDestruicaoObjeto(objetoId: string, destruicao: Omit<Destruicao, 'id' | 'created_at' | 'veiculo_id' | 'objeto_id'>) {
  await getScopedObjetoRecord(objetoId);

  const { data, error } = await supabase
    .from('destruicoes')
    .insert({ ...destruicao, objeto_id: objetoId })
    .select()
    .single();
  if (error) throw error;
  return data as Destruicao;
}

export async function getLaudosObjeto() {
  const scope = await getCurrentAccessScope();
  const allowedDelegacias = await resolveScopedDelegacias(scope);

  if (allowedDelegacias && allowedDelegacias.length === 0) return [];

  const joinSelect = allowedDelegacias
    ? '*, objetos!inner(descricao, marca_modelo, delegacia_nome)'
    : '*, objetos(descricao, marca_modelo, delegacia_nome)';

  let query = supabase
    .from('laudos')
    .select(joinSelect)
    .not('objeto_id', 'is', null)
    .order('emitido_em', { ascending: false });
  if (allowedDelegacias) query = query.in('objetos.delegacia_nome', allowedDelegacias);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createLaudoObjeto(objetoId: string, laudo: Omit<Laudo, 'id' | 'created_at' | 'numero' | 'veiculo_id' | 'objeto_id'>) {
  await getScopedObjetoRecord(objetoId);

  const { data: numero, error: numeroError } = await supabase.rpc('proximo_numero_laudo');
  if (numeroError) throw numeroError;

  const { data, error } = await supabase
    .from('laudos')
    .insert({ ...laudo, numero: numero as string, objeto_id: objetoId })
    .select()
    .single();
  if (error) throw error;
  return data as Laudo;
}

export async function getHistoricoObjeto(objetoId: string) {
  await getScopedObjetoRecord(objetoId);

  const { data, error } = await supabase
    .from('historico')
    .select('*')
    .eq('objeto_id', objetoId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as HistoricoItem[];
}

export async function addHistoricoObjeto(item: Omit<HistoricoItem, 'id' | 'created_at' | 'veiculo_id' | 'objeto_id'> & { objeto_id: string }) {
  await getScopedObjetoRecord(item.objeto_id);

  const { data, error } = await supabase
    .from('historico')
    .insert(item)
    .select()
    .single();
  if (error) throw error;
  return data as HistoricoItem;
}

// ── Destruições ──────────────────────────────────────────────

export async function getDestruicoes() {
  const scope = await getCurrentAccessScope();
  const allowedDelegacias = await resolveScopedDelegacias(scope);

  if (allowedDelegacias && allowedDelegacias.length === 0) return [];

  // Scope resolution happens server-side: when the user is restricted, use an
  // inner join on veiculos filtered by the allowed delegacias so the database
  // only returns the rows in scope (admin => no filter => outer-friendly join).
  const joinSelect = allowedDelegacias
    ? '*, veiculos!inner(placa, marca_modelo, delegacia_nome)'
    : '*, veiculos(placa, marca_modelo, delegacia_nome)';

  let query = supabase
    .from('destruicoes')
    .select(joinSelect)
    .order('created_at', { ascending: false });
  if (allowedDelegacias) query = query.in('veiculos.delegacia_nome', allowedDelegacias);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createDestruicao(destruicao: Omit<Destruicao, 'id' | 'created_at' | 'veiculo_id'> & { veiculo_id: string }) {
  await getScopedVehicleRecord(destruicao.veiculo_id);

  const { data, error } = await supabase
    .from('destruicoes')
    .insert(destruicao)
    .select()
    .single();
  if (error) throw error;
  return data as Destruicao;
}

// ── Laudos ───────────────────────────────────────────────────

export async function getLaudos() {
  const scope = await getCurrentAccessScope();
  const allowedDelegacias = await resolveScopedDelegacias(scope);

  if (allowedDelegacias && allowedDelegacias.length === 0) return [];

  const joinSelect = allowedDelegacias
    ? '*, veiculos!inner(placa, marca_modelo, delegacia_nome)'
    : '*, veiculos(placa, marca_modelo, delegacia_nome)';

  let query = supabase
    .from('laudos')
    .select(joinSelect)
    .order('emitido_em', { ascending: false });
  if (allowedDelegacias) query = query.in('veiculos.delegacia_nome', allowedDelegacias);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createLaudo(laudo: Omit<Laudo, 'id' | 'created_at' | 'veiculo_id'> & { veiculo_id: string }) {
  await getScopedVehicleRecord(laudo.veiculo_id);

  const { data, error } = await supabase
    .from('laudos')
    .insert(laudo)
    .select()
    .single();
  if (error) throw error;
  return data as Laudo;
}

// ── Histórico ────────────────────────────────────────────────

export async function getHistorico(veiculoId: string) {
  await getScopedVehicleRecord(veiculoId);

  const { data, error } = await supabase
    .from('historico')
    .select('*')
    .eq('veiculo_id', veiculoId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as HistoricoItem[];
}

export async function addHistorico(item: Omit<HistoricoItem, 'id' | 'created_at' | 'veiculo_id'> & { veiculo_id: string }) {
  await getScopedVehicleRecord(item.veiculo_id);

  const { data, error } = await supabase
    .from('historico')
    .insert(item)
    .select()
    .single();
  if (error) throw error;
  return data as HistoricoItem;
}

// ── Profiles ─────────────────────────────────────────────────

export async function getProfiles() {
  const currentProfile = await getCurrentProfile();
  if (!canAccessAdminArea(currentProfile?.cargo)) {
    return [] as Profile[];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('nome');
  if (error) throw error;
  return data as Profile[];
}

export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) return null;
  return data as Profile;
}

const OPTIONAL_PROFILE_COLUMNS = [
  'avatar_url',
  'notificacoes_push_habilitadas',
  'biometria_habilitada',
] as const;

/**
 * Updates the CURRENTLY AUTHENTICATED user's own profile row (self-service
 * "Meu perfil" screen: nome, avatar_url, and device preference columns).
 * Falls back to omitting any column that hasn't been created yet (see
 * schema.sql's "PERFIL DO USUÁRIO" / "PREFERÊNCIAS PESSOAIS" blocks),
 * mirroring the optional-column fallback pattern used for vehicles above.
 */
export async function updateCurrentProfile(updates: Partial<Pick<Profile, 'nome' | 'avatar_url' | 'notificacoes_push_habilitadas' | 'biometria_habilitada'>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');

  let payload: Record<string, unknown> = { ...updates };

  while (true) {
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select()
      .single();

    if (!error) return data as Profile;

    const fallbackPayload = ((): Record<string, unknown> | null => {
      for (const columnName of OPTIONAL_PROFILE_COLUMNS) {
        if (payload[columnName] !== undefined && isMissingOptionalColumnError(error, columnName)) {
          return omitOptionalColumn(payload, columnName);
        }
      }
      return null;
    })();

    if (!fallbackPayload) throw error;
    payload = fallbackPayload;
  }
}

// ── Checklist de Recepção ─────────────────────────────────────

export interface ChecklistRecepcao {
  id: string;
  veiculo_id: string;
  documentos_presentes: boolean;
  chaves_presentes: boolean;
  placa_identificavel: boolean;
  chassi_identificavel: boolean;
  vidros_intactos: boolean;
  pneus_presentes: boolean;
  motor_presente: boolean;
  bateria_presente: boolean;
  macaco_chave_roda: boolean;
  triangulo_presente: boolean;
  extintor_presente: boolean;
  observacoes?: string;
  registrado_por?: string;
  created_at: string;
  updated_at: string;
}

export async function getChecklist(veiculoId: string): Promise<ChecklistRecepcao | null> {
  const { data, error } = await supabase
    .from('checklist_recepcao')
    .select('*')
    .eq('veiculo_id', veiculoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as ChecklistRecepcao | null;
}

export async function saveChecklist(payload: Omit<ChecklistRecepcao, 'id' | 'created_at' | 'updated_at'>): Promise<ChecklistRecepcao> {
  const existing = await getChecklist(payload.veiculo_id);
  if (existing) {
    const { data, error } = await supabase
      .from('checklist_recepcao')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as ChecklistRecepcao;
  }
  const { data, error } = await supabase
    .from('checklist_recepcao')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as ChecklistRecepcao;
}

// ── Serviços e Cobranças ──────────────────────────────────────

export type ServicoTipo = 'diaria' | 'empilhadeira' | 'guincho' | 'munck';

export interface Servico {
  id: string;
  veiculo_id: string;
  tipo: ServicoTipo;
  descricao?: string;
  data_inicio: string;
  data_fim?: string;
  quantidade: number;
  valor_unitario: number;
  pago: boolean;
  observacoes?: string;
  registrado_por?: string;
  created_at: string;
  updated_at: string;
}

export interface ServicoTipoStats {
  tipo: ServicoTipo;
  label: string;
  lancamentos: number;
  total: number;
}

export interface ServicoStats {
  totalServicos: number;
  totalCobrado: number;
  totalPago: number;
  totalPendente: number;
  servicosPagos: number;
  servicosPendentes: number;
  veiculosComCobranca: number;
  ticketMedio: number;
  adimplenciaPercent: number;
  tipos: ServicoTipoStats[];
}

const SERVICO_TIPO_LABELS: Record<ServicoTipo, string> = {
  diaria: 'Diária de pátio',
  empilhadeira: 'Aluguel de empilhadeira',
  guincho: 'Guincho / plataforma',
  munck: 'Munck / guindaste',
};

export async function getServicos(veiculoId: string): Promise<Servico[]> {
  const { data, error } = await supabase
    .from('servicos')
    .select('*')
    .eq('veiculo_id', veiculoId)
    .order('data_inicio', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Servico[];
}

export async function getAllServicos(): Promise<(Servico & { veiculos?: { placa: string; marca_modelo: string; delegacia_nome?: string } })[]> {
  const scope = await getCurrentAccessScope();
  const allowedDelegacias = await resolveScopedDelegacias(scope);

  if (allowedDelegacias && allowedDelegacias.length === 0) return [];

  const joinSelect = allowedDelegacias
    ? '*, veiculos!inner(placa, marca_modelo, delegacia_nome)'
    : '*, veiculos(placa, marca_modelo, delegacia_nome)';

  let query = supabase
    .from('servicos')
    .select(joinSelect)
    .order('data_inicio', { ascending: false });
  if (allowedDelegacias) query = query.in('veiculos.delegacia_nome', allowedDelegacias);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as any[];
}

export async function getServicoStats(): Promise<ServicoStats> {
  const servicos = await getAllServicos();
  const byTipo = new Map<ServicoTipo, ServicoTipoStats>();
  const veiculosComCobranca = new Set<string>();

  const stats: ServicoStats = {
    totalServicos: 0,
    totalCobrado: 0,
    totalPago: 0,
    totalPendente: 0,
    servicosPagos: 0,
    servicosPendentes: 0,
    veiculosComCobranca: 0,
    ticketMedio: 0,
    adimplenciaPercent: 0,
    tipos: [],
  };

  servicos.forEach((servico) => {
    const totalItem = Number(servico.quantidade) * Number(servico.valor_unitario);
    stats.totalServicos += 1;
    stats.totalCobrado += totalItem;

    if (servico.pago) {
      stats.totalPago += totalItem;
      stats.servicosPagos += 1;
    } else {
      stats.servicosPendentes += 1;
    }

    veiculosComCobranca.add(servico.veiculo_id);

    const current = byTipo.get(servico.tipo) ?? {
      tipo: servico.tipo,
      label: SERVICO_TIPO_LABELS[servico.tipo] ?? servico.tipo,
      lancamentos: 0,
      total: 0,
    };

    current.lancamentos += 1;
    current.total += totalItem;
    byTipo.set(servico.tipo, current);
  });

  stats.totalPendente = stats.totalCobrado - stats.totalPago;
  stats.veiculosComCobranca = veiculosComCobranca.size;
  stats.ticketMedio = stats.totalServicos > 0 ? stats.totalCobrado / stats.totalServicos : 0;
  stats.adimplenciaPercent = stats.totalCobrado > 0 ? (stats.totalPago / stats.totalCobrado) * 100 : 0;
  stats.tipos = Array.from(byTipo.values()).sort((left, right) => right.total - left.total);

  return stats;
}

export async function createServico(servico: Omit<Servico, 'id' | 'created_at' | 'updated_at'>): Promise<Servico> {
  await getScopedVehicleRecord(servico.veiculo_id);
  const { data, error } = await supabase
    .from('servicos')
    .insert(servico)
    .select()
    .single();
  if (error) throw error;
  return data as Servico;
}

export async function updateServico(id: string, updates: Partial<Omit<Servico, 'id' | 'veiculo_id' | 'created_at' | 'updated_at'>>): Promise<Servico> {
  const { data, error } = await supabase
    .from('servicos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Servico;
}

export async function deleteServico(id: string): Promise<void> {
  const { error } = await supabase.from('servicos').delete().eq('id', id);
  if (error) throw error;
}

export function calcDiasNoPatio(createdAt: string): number {
  const entrada = new Date(createdAt);
  const hoje = new Date();
  const diff = hoje.getTime() - entrada.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function calcTotalServicos(servicos: Servico[]): number {
  return servicos.reduce((sum, s) => sum + s.quantidade * s.valor_unitario, 0);
}
