import React from "react";
import { cores } from "../styles/theme";

/**
 * Lista simples de exercícios para a pessoa escolher um. Usada na tela inicial,
 * nos resultados da busca, na lista de um grupo muscular e nos favoritos.
 */
export default function ListaExercicios({ exercicios, onEscolher, favoritos = [] }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {exercicios.map((ex) => {
        const totalAlternativas = ex.alternativas?.length ?? 0;
        const detalhes = [
          ex.gruposPrincipais?.join(", "),
          `${totalAlternativas} alternativa${totalAlternativas !== 1 ? "s" : ""}`,
          ex.semEquipamento ? "sem equipamento" : null,
        ].filter(Boolean);

        return (
          <li key={ex.codigo}>
            <button
              onClick={() => onEscolher(ex)}
              style={{
                width: "100%",
                textAlign: "left",
                background: cores.cardFundo,
                border: `1px solid ${cores.borda}`,
                borderRadius: 14,
                padding: "14px 16px",
                minHeight: 48,
                cursor: "pointer",
                color: cores.texto,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 800, fontSize: 15, overflowWrap: "anywhere" }}>
                  {ex.nome}
                  {favoritos.includes(ex.codigo) && (
                    <span aria-label="favorito" style={{ color: cores.orange, marginLeft: 6 }}>
                      ♥
                    </span>
                  )}
                </span>
                <span style={{ display: "block", fontSize: 12.5, color: cores.textoSecundario, marginTop: 3 }}>
                  {detalhes.join(" · ")}
                </span>
              </span>
              <span aria-hidden="true" style={{ color: cores.textoSecundario, fontSize: 20, flexShrink: 0 }}>
                ›
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
