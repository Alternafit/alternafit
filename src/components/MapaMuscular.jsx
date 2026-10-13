import React from "react";
import Model from "react-body-highlighter";
import { cores } from "../styles/theme";

// Cores do mapa: músculo principal em vermelho, auxiliar em laranja
const COR_PRINCIPAL = "#E5484D";
const COR_AUXILIAR = cores.orange;
const COR_CORPO = "#4A5571";

// Grupos musculares do banco -> músculos que a biblioteca sabe desenhar
const MUSCULOS_POR_GRUPO = {
  peitoral: ["chest"],
  deltoides: ["front-deltoids", "back-deltoids"],
  triceps: ["triceps"],
  biceps: ["biceps"],
  antebraco: ["forearm"],
  dorsal: ["upper-back"],
  trapezio: ["trapezius"],
  lombar: ["lower-back"],
  abdomen: ["abs", "obliques"],
  quadriceps: ["quadriceps"],
  "posterior de coxa": ["hamstring"],
  gluteos: ["gluteal"],
  panturrilha: ["calves", "left-soleus", "right-soleus"],
  adutores: ["adductor"],
};

/** "Glúteos" -> "gluteos" (sem acentos e em minúsculas, para achar no mapa acima). */
function normalizar(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function musculosDe(grupos = []) {
  // Grupos que não estão no mapa (ex.: um grupo novo na planilha) são ignorados
  return grupos.flatMap((grupo) => MUSCULOS_POR_GRUPO[normalizar(grupo)] ?? []);
}

function ItemLegenda({ cor, rotulo, grupos }) {
  if (grupos.length === 0) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 6 }}>
      <span
        aria-hidden="true"
        style={{ width: 9, height: 9, borderRadius: 999, background: cor, flexShrink: 0, transform: "translateY(1px)" }}
      />
      <span>
        {rotulo}: <strong style={{ color: cores.texto }}>{grupos.join(", ")}</strong>
      </span>
    </span>
  );
}

/**
 * Desenho do corpo (frente e costas) com os músculos trabalhados pintados.
 * tamanho="compacto" é usado nos cards de alternativa.
 */
export default function MapaMuscular({ principais = [], auxiliares = [], tamanho = "normal" }) {
  // A biblioteca soma as "frequências": auxiliar = 1 (laranja), principal = 2 (vermelho).
  // Se um músculo aparecer nos dois, a soma passa de 2 e o vermelho prevalece.
  const dados = [
    { name: "Auxiliar", muscles: musculosDe(auxiliares), frequency: 1 },
    { name: "Principal", muscles: musculosDe(principais), frequency: 2 },
  ];
  if (dados.every((d) => d.muscles.length === 0)) return null;

  const largura = tamanho === "compacto" ? 58 : 82;
  const propsDoModelo = {
    data: dados,
    bodyColor: COR_CORPO,
    highlightedColors: [COR_AUXILIAR, COR_PRINCIPAL],
    style: { width: largura },
  };
  const descricao =
    `Músculos trabalhados. Principal: ${principais.join(", ") || "nenhum"}.` +
    (auxiliares.length ? ` Auxiliares: ${auxiliares.join(", ")}.` : "");

  return (
    <figure style={{ margin: 0, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <div role="img" aria-label={descricao} style={{ display: "flex", gap: 6 }}>
        <Model type="anterior" {...propsDoModelo} />
        <Model type="posterior" {...propsDoModelo} />
      </div>
      <figcaption
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: tamanho === "compacto" ? 11.5 : 12.5,
          color: cores.textoSecundario,
          flex: "1 1 120px",
        }}
      >
        <ItemLegenda cor={COR_PRINCIPAL} rotulo="Principal" grupos={principais} />
        <ItemLegenda cor={COR_AUXILIAR} rotulo="Auxiliar" grupos={auxiliares} />
      </figcaption>
    </figure>
  );
}
