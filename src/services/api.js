/**
 * SERVICE LAYER
 * Isola toda a "busca de dados" num só lugar. As funções consultam a API
 * do Django (pasta backend/), que devolve os exercícios no mesmo formato
 * do mock em src/data/exercicios.js.
 *
 * O endereço da API pode ser trocado pela variável de ambiente VITE_API_URL
 * (no app publicado, ela aponta para o backend no PythonAnywhere).
 *
 * A versão original deste arquivo (que lia o mock) está guardada na tag
 * "backup-frontend-vlad" do Git.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api";

async function buscarJson(caminho) {
  const resposta = await fetch(`${BASE_URL}${caminho}`);
  if (!resposta.ok) throw new Error(`Erro ao consultar a API (${resposta.status})`);
  return resposta.json();
}

/** Todos os exercícios do catálogo (para a tela inicial e para os favoritos). */
export async function obterTodosExercicios() {
  return buscarJson("/exercicios/");
}

/** Exercícios cujo nome, nome em inglês ou apelido contém o termo. O nome exato vem primeiro. */
export async function buscarExercicios(termo) {
  const chave = termo.trim();
  if (!chave) return [];
  return buscarJson(`/exercicios/?busca=${encodeURIComponent(chave)}`);
}

/** Retorna os exercícios que trabalham o grupo muscular (os de foco principal primeiro). */
export async function buscarExerciciosPorGrupoMuscular(grupo) {
  return buscarJson(`/exercicios/?grupo=${encodeURIComponent(grupo)}`);
}

/** Retorna os nomes dos grupos musculares (para os chips de navegação). */
export async function obterGruposMusculares() {
  const grupos = await buscarJson("/grupos-musculares/");
  return grupos.map((grupo) => grupo.nome);
}
