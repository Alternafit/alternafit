import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import FiltroChips from "./components/FiltroChips";
import CardPrincipal from "./components/CardPrincipal";
import CardAlternativa from "./components/CardAlternativa";
import ModalVideo from "./components/ModalVideo";
import AvisoBeta from "./components/AvisoBeta";
import ListaExercicios from "./components/ListaExercicios";
import { cores, fonte } from "./styles/theme";
import { FILTROS_EQUIPAMENTO } from "./data/exercicios";
import {
  buscarExercicios,
  buscarExerciciosPorGrupoMuscular,
  obterGruposMusculares,
  obterTodosExercicios,
} from "./services/api";

const MENSAGEM_ERRO =
  "Não foi possível falar com o servidor. Confira sua conexão e tente de novo.";

// Os favoritos ficam salvos no próprio navegador (localStorage), sem precisar de login.
const CHAVE_FAVORITOS = "alternafit:favoritos";

// A busca acontece enquanto a pessoa digita: a partir de 2 letras, depois de uma pausa curta
// (assim o app não consulta a API a cada tecla).
const MINIMO_LETRAS = 2;
const PAUSA_DIGITACAO_MS = 350;

// O botão "voltar" do celular volta para a lista de onde o exercício foi aberto
if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

function lerFavoritosSalvos() {
  try {
    const salvos = JSON.parse(localStorage.getItem(CHAVE_FAVORITOS));
    if (!Array.isArray(salvos)) return [];
    // Mantém só códigos de exercício válidos (números inteiros), sem repetição
    return [...new Set(salvos.filter((id) => Number.isInteger(id) && id > 0))];
  } catch {
    return [];
  }
}

/** Compara nomes em ordem alfabética, ignorando acentos e maiúsculas. */
function compararNomes(a, b) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

/** Separa o catálogo em seções pelo grupo muscular principal, em ordem alfabética. */
function agruparPorGrupoPrincipal(exercicios) {
  const secoes = new Map();
  for (const ex of exercicios) {
    const grupo = ex.gruposPrincipais?.[0] ?? "Outros";
    if (!secoes.has(grupo)) secoes.set(grupo, []);
    secoes.get(grupo).push(ex);
  }
  return [...secoes.entries()]
    .sort(([a], [b]) => compararNomes(a, b))
    .map(([grupo, lista]) => ({ grupo, exercicios: [...lista].sort((a, b) => compararNomes(a.nome, b.nome)) }));
}

/** Corta textos muito longos (ex.: alguém colou um texto enorme na busca). */
function encurtar(texto, limite = 60) {
  return texto.length > limite ? `${texto.slice(0, limite)}…` : texto;
}

function TituloSecao({ children }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: cores.textoSecundario,
        marginBottom: 12,
        overflowWrap: "anywhere",
      }}
    >
      {children}
    </div>
  );
}

function CaixaAviso({ children }) {
  return (
    <div
      style={{
        background: cores.cardFundo,
        border: `1px solid ${cores.borda}`,
        borderRadius: 16,
        padding: 24,
        textAlign: "center",
        color: cores.textoSecundario,
        marginBottom: 30,
        // Quebra palavras enormes para não estourar a tela
        overflowWrap: "anywhere",
      }}
    >
      {children}
    </div>
  );
}

function CaixaErro({ onTentarDeNovo }) {
  return (
    <div
      style={{
        background: cores.cardFundo,
        border: `1px solid ${cores.perigo}`,
        borderRadius: 16,
        padding: 24,
        textAlign: "center",
        color: cores.texto,
        marginBottom: 30,
      }}
    >
      <p style={{ margin: "0 0 14px" }}>{MENSAGEM_ERRO}</p>
      <button
        onClick={onTentarDeNovo}
        style={{
          background: cores.navy,
          color: cores.navyTexto,
          border: "none",
          borderRadius: 12,
          padding: "10px 22px",
          minHeight: 44,
          fontWeight: 800,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Tentar de novo
      </button>
    </div>
  );
}

function Carregando() {
  return (
    <div style={{ textAlign: "center", color: cores.textoSecundario, fontSize: 14, marginBottom: 24 }}>
      Carregando...
    </div>
  );
}

export default function App() {
  const [termoBusca, setTermoBusca] = useState("");
  // Tela aberta: "inicio" (todos os exercícios), "busca" (resultados), "grupo" (um grupo
  // muscular), "favoritos" ou "exercicio" (um exercício e suas alternativas)
  const [tela, setTela] = useState("inicio");
  // De qual lista o exercício foi aberto, para o "Voltar" levar de volta para ela
  const [origem, setOrigem] = useState("inicio");

  // Catálogo completo, usado na tela inicial e nos favoritos (null = ainda carregando)
  const [catalogo, setCatalogo] = useState(null);
  const [erroCatalogo, setErroCatalogo] = useState(false);
  const [grupos, setGrupos] = useState([]);

  const [grupoSelecionado, setGrupoSelecionado] = useState(null);
  const [exerciciosDoGrupo, setExerciciosDoGrupo] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [termoResultados, setTermoResultados] = useState("");
  const [exercicioAtivo, setExercicioAtivo] = useState(null);
  // Mensagem curta mostrada quando a pessoa aperta "Buscar" com o campo vazio
  const [aviso, setAviso] = useState(null);

  const [filtroEquipamento, setFiltroEquipamento] = useState("Todos");
  const [favoritos, setFavoritos] = useState(lerFavoritosSalvos);
  const [videoAberto, setVideoAberto] = useState(null);

  // Estado das consultas da busca e dos grupos
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  // Guarda a última consulta feita, para o botão "Tentar de novo" repetir exatamente ela
  const ultimaConsulta = useRef(null);
  // Número da consulta mais recente. Com internet lenta, uma resposta antiga pode chegar
  // depois de uma nova; esse número permite ignorar respostas que já ficaram velhas.
  const idConsulta = useRef(0);
  const temporizadorBusca = useRef(null);

  // Posição da rolagem da lista, para voltar ao mesmo ponto depois de abrir um exercício
  const rolagemDaLista = useRef(0);
  const restaurarRolagem = useRef(null);
  const areaConteudo = useRef(null);
  const telaAtual = useRef(tela);
  const origemAtual = useRef(origem);
  telaAtual.current = tela;
  origemAtual.current = origem;

  /**
   * Roda uma consulta à API mostrando "Carregando..." e, se falhar, a mensagem de erro.
   * A consulta recebe a função aindaAtual(), que diz se ela ainda é a mais recente.
   */
  async function comCarregamento(consulta) {
    const id = ++idConsulta.current;
    const aindaAtual = () => id === idConsulta.current;
    ultimaConsulta.current = consulta;
    setCarregando(true);
    setErro(null);
    try {
      await consulta(aindaAtual);
    } catch {
      if (aindaAtual()) setErro(MENSAGEM_ERRO);
    } finally {
      if (aindaAtual()) setCarregando(false);
    }
  }

  /** Descarta consultas que ainda estavam chegando (a pessoa mudou de tela). */
  function cancelarConsultas() {
    idConsulta.current += 1;
    setCarregando(false);
    setErro(null);
  }

  // Carrega o catálogo completo e os grupos musculares (para os chips)
  function carregarCatalogo() {
    setErroCatalogo(false);
    Promise.all([obterTodosExercicios(), obterGruposMusculares()])
      .then(([todos, listaGrupos]) => {
        setCatalogo(todos);
        setGrupos(listaGrupos);
      })
      .catch(() => setErroCatalogo(true));
  }

  useEffect(carregarCatalogo, []);

  // Salva os favoritos no navegador sempre que a lista muda
  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(favoritos));
    } catch {
      // Navegador sem armazenamento (ex.: modo privado): os favoritos valem só nesta visita.
    }
  }, [favoritos]);

  // Botão "voltar" do celular/navegador: com um exercício aberto, volta para a lista de origem
  useEffect(() => {
    function aoVoltar() {
      if (telaAtual.current === "exercicio") {
        restaurarRolagem.current = rolagemDaLista.current;
        setTela(origemAtual.current);
      }
    }
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, []);

  // Ao abrir um exercício, rola até ele; ao voltar para a lista, volta para onde a pessoa estava
  useEffect(() => {
    if (tela === "exercicio") {
      areaConteudo.current?.scrollIntoView({ block: "start" });
    } else if (restaurarRolagem.current !== null) {
      window.scrollTo(0, restaurarRolagem.current);
      restaurarRolagem.current = null;
    }
  }, [tela, exercicioAtivo]);

  function irParaInicio() {
    clearTimeout(temporizadorBusca.current);
    cancelarConsultas();
    setAviso(null);
    setGrupoSelecionado(null);
    setTela("inicio");
  }

  function abrirExercicio(exercicio, de) {
    rolagemDaLista.current = window.scrollY;
    setExercicioAtivo(exercicio);
    setOrigem(de);
    setFiltroEquipamento("Todos");
    setAviso(null);
    setTela("exercicio");
    // Cria um passo no histórico, para o "voltar" do celular voltar para a lista
    window.history.pushState({ alternafit: "exercicio" }, "");
  }

  function pesquisar(termo) {
    comCarregamento(async (aindaAtual) => {
      const lista = await buscarExercicios(termo);
      if (!aindaAtual()) return;
      setResultados(lista);
      setTermoResultados(termo);
      setGrupoSelecionado(null);
      setTela("busca");
    });
  }

  function aoDigitar(texto) {
    setTermoBusca(texto);
    setAviso(null);
    clearTimeout(temporizadorBusca.current);
    const termo = texto.trim();
    if (termo.length < MINIMO_LETRAS) {
      // Apagou a busca: sai da lista de resultados
      if (tela === "busca") irParaInicio();
      return;
    }
    temporizadorBusca.current = setTimeout(() => pesquisar(termo), PAUSA_DIGITACAO_MS);
  }

  function buscar(e) {
    e.preventDefault();
    clearTimeout(temporizadorBusca.current);
    const termo = termoBusca.trim();
    if (!termo) {
      setAviso("Digite o nome de um exercício para buscar.");
      return;
    }
    pesquisar(termo);
  }

  function limparBusca() {
    clearTimeout(temporizadorBusca.current);
    setTermoBusca("");
    setAviso(null);
    if (tela === "busca") irParaInicio();
  }

  function selecionarGrupo(grupo) {
    if (grupo === "Todos") {
      irParaInicio();
      return;
    }
    setAviso(null);
    setGrupoSelecionado(grupo);
    setTela("grupo");
    comCarregamento(async (aindaAtual) => {
      setExerciciosDoGrupo([]);
      const lista = await buscarExerciciosPorGrupoMuscular(grupo);
      if (aindaAtual()) setExerciciosDoGrupo(lista);
    });
  }

  function alternarFavoritos() {
    if (tela === "favoritos") {
      irParaInicio();
      return;
    }
    clearTimeout(temporizadorBusca.current);
    cancelarConsultas();
    setAviso(null);
    setGrupoSelecionado(null);
    setTela("favoritos");
  }

  function toggleFavorito(id) {
    setFavoritos((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  }

  const secoesDoCatalogo = useMemo(() => (catalogo ? agruparPorGrupoPrincipal(catalogo) : []), [catalogo]);

  // Favoritos que ainda existem no catálogo (um exercício removido da planilha não conta)
  const exerciciosFavoritos = useMemo(() => {
    if (!catalogo) return [];
    return catalogo.filter((ex) => favoritos.includes(ex.codigo)).sort((a, b) => compararNomes(a.nome, b.nome));
  }, [catalogo, favoritos]);
  const totalFavoritos = catalogo ? exerciciosFavoritos.length : favoritos.length;

  const alternativasFiltradas =
    exercicioAtivo?.alternativas.filter((alt) => {
      if (filtroEquipamento === "Todos") return true;
      if (filtroEquipamento === "Sem Equipamento") return alt.semEquipamento;
      return !alt.semEquipamento;
    }) ?? [];

  const chipSelecionado = tela === "grupo" ? grupoSelecionado : tela === "inicio" ? "Todos" : null;
  const nomeDaOrigem = {
    inicio: "todos os exercícios",
    busca: "os resultados",
    grupo: grupoSelecionado ?? "o grupo",
    favoritos: "os favoritos",
  }[origem];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: cores.fundo,
        fontFamily: fonte,
        color: cores.texto,
        paddingBottom: 60,
      }}
    >
      <Header
        totalFavoritos={totalFavoritos}
        favoritosAbertos={tela === "favoritos"}
        onFavoritos={alternarFavoritos}
        onInicio={() => {
          limparBusca();
          irParaInicio();
          window.scrollTo(0, 0);
        }}
      />

      {/* maxWidth reduzido de proposito: a ideia e simular um app de celular
          mesmo quando visto num navegador de PC, ja que o uso principal e mobile */}
      <main style={{ maxWidth: 480, margin: "0 auto", padding: "0 18px" }}>
        <AvisoBeta />

        <section style={{ textAlign: "center", padding: "40px 0 32px" }}>
          <h1
            style={{
              fontSize: "clamp(26px, 4.5vw, 38px)",
              fontWeight: 900,
              lineHeight: 1.15,
              margin: "0 0 10px",
            }}
          >
            Aparelho ocupado? <span style={{ color: cores.orange }}>A gente resolve</span>
          </h1>
          <p style={{ color: cores.textoSecundario, fontSize: 15, maxWidth: 480, margin: "0 auto" }}>
            Busque um exercício e veja alternativas equivalentes, sempre com
            pelo menos uma opção sem aparelho.
          </p>

          <SearchBar valor={termoBusca} onChange={aoDigitar} onSubmit={buscar} onLimpar={limparBusca} />

          {/* Durante a busca, os chips somem para os resultados aparecerem logo abaixo do campo */}
          {tela !== "busca" && (
            <div style={{ marginTop: 20, maxWidth: 480, marginInline: "auto" }}>
              <FiltroChips
                titulo="Ou navegue por grupo muscular"
                opcoes={["Todos", ...grupos]}
                selecionado={chipSelecionado}
                onSelecionar={selecionarGrupo}
              />
            </div>
          )}
        </section>

        <div ref={areaConteudo} style={{ scrollMarginTop: 12 }}>
          {erro && <CaixaErro onTentarDeNovo={() => comCarregamento(ultimaConsulta.current)} />}
          {carregando && <Carregando />}
          {aviso && !erro && <CaixaAviso>{aviso}</CaixaAviso>}

          {tela === "inicio" && (
            <section>
              {erroCatalogo ? (
                <CaixaErro onTentarDeNovo={carregarCatalogo} />
              ) : catalogo === null ? (
                <Carregando />
              ) : (
                <>
                  <TituloSecao>TODOS OS EXERCÍCIOS ({catalogo.length}), POR GRUPO MUSCULAR PRINCIPAL</TituloSecao>
                  {secoesDoCatalogo.map(({ grupo, exercicios }) => (
                    <div key={grupo} style={{ marginBottom: 26 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: cores.texto, margin: "0 0 10px" }}>
                        {grupo} <span style={{ color: cores.textoSecundario, fontWeight: 600 }}>({exercicios.length})</span>
                      </div>
                      <ListaExercicios
                        exercicios={exercicios}
                        favoritos={favoritos}
                        onEscolher={(ex) => abrirExercicio(ex, "inicio")}
                      />
                    </div>
                  ))}
                </>
              )}
            </section>
          )}

          {tela === "busca" && (
            <section>
              <TituloSecao>
                RESULTADOS PARA "{encurtar(termoResultados).toUpperCase()}" ({resultados.length})
              </TituloSecao>
              {resultados.length === 0 ? (
                <CaixaAviso>
                  Nenhum exercício encontrado para "{encurtar(termoResultados)}". Tente outro nome ou
                  apague a busca para ver todos os exercícios.
                </CaixaAviso>
              ) : (
                <ListaExercicios
                  exercicios={resultados}
                  favoritos={favoritos}
                  onEscolher={(ex) => abrirExercicio(ex, "busca")}
                />
              )}
            </section>
          )}

          {tela === "grupo" && (
            <section>
              <TituloSecao>EXERCÍCIOS DE {grupoSelecionado?.toUpperCase()}</TituloSecao>
              {carregando || erro ? null : exerciciosDoGrupo.length === 0 ? (
                <CaixaAviso>Nenhum exercício cadastrado nesse grupo ainda.</CaixaAviso>
              ) : (
                <ListaExercicios
                  exercicios={exerciciosDoGrupo}
                  favoritos={favoritos}
                  onEscolher={(ex) => abrirExercicio(ex, "grupo")}
                />
              )}
            </section>
          )}

          {tela === "favoritos" && (
            <section>
              <TituloSecao>SEUS FAVORITOS ({exerciciosFavoritos.length})</TituloSecao>
              {erroCatalogo ? (
                <CaixaErro onTentarDeNovo={carregarCatalogo} />
              ) : catalogo === null ? (
                <Carregando />
              ) : exerciciosFavoritos.length === 0 ? (
                <CaixaAviso>
                  Você ainda não tem favoritos. Toque no ♡ de um exercício para guardá-lo aqui.
                </CaixaAviso>
              ) : (
                <ListaExercicios
                  exercicios={exerciciosFavoritos}
                  favoritos={favoritos}
                  onEscolher={(ex) => abrirExercicio(ex, "favoritos")}
                />
              )}
            </section>
          )}

          {tela === "exercicio" && exercicioAtivo && (
            <section style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <button
                onClick={() => window.history.back()}
                style={{
                  alignSelf: "flex-start",
                  background: "transparent",
                  border: "none",
                  color: cores.navySoft,
                  fontWeight: 700,
                  fontSize: 14,
                  padding: "10px 0",
                  minHeight: 44,
                  cursor: "pointer",
                }}
              >
                ← Voltar para {nomeDaOrigem}
              </button>

              <CardPrincipal
                exercicio={exercicioAtivo}
                totalAlternativasVisiveis={alternativasFiltradas.length}
                onVerVideo={setVideoAberto}
                favoritado={favoritos.includes(exercicioAtivo.codigo)}
                onToggleFavorito={toggleFavorito}
              />

              <FiltroChips
                titulo="Filtrar alternativas por equipamento"
                opcoes={FILTROS_EQUIPAMENTO}
                selecionado={filtroEquipamento}
                onSelecionar={setFiltroEquipamento}
              />

              <div>
                <TituloSecao>ALTERNATIVAS SUGERIDAS</TituloSecao>

                {alternativasFiltradas.length === 0 ? (
                  <div style={{ color: cores.textoSecundario, fontSize: 14 }}>
                    Nenhuma alternativa desse tipo para este exercício. Tente
                    outro filtro de equipamento.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {alternativasFiltradas.map((alt) => (
                      <CardAlternativa
                        key={alt.codigo || alt.nome}
                        exercicio={alt}
                        favoritos={favoritos}
                        onToggleFavorito={toggleFavorito}
                        onVerVideo={setVideoAberto}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      <ModalVideo video={videoAberto} onClose={() => setVideoAberto(null)} />
    </div>
  );
}
