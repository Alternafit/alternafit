import React, { useRef } from "react";
import { cores } from "../styles/theme";

export default function SearchBar({ valor, onChange, onSubmit, onLimpar }) {
  const campo = useRef(null);

  function enviar(e) {
    // Fecha o teclado do celular para os resultados aparecerem inteiros na tela
    campo.current?.blur();
    onSubmit(e);
  }

  function limpar() {
    onLimpar();
    // Volta o cursor para o campo, pronto para digitar outra busca
    campo.current?.focus();
  }

  return (
    <form
      role="search"
      onSubmit={enviar}
      style={{
        display: "flex",
        gap: 10,
        maxWidth: 480,
        margin: "28px auto 0",
        flexWrap: "wrap",
      }}
    >
      <div style={{ position: "relative", flex: "1 1 220px", display: "flex" }}>
        <input
          ref={campo}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex: Supino Reto, Agachamento Livre, Puxada Alta"
          aria-label="Buscar exercício"
          autoComplete="off"
          enterKeyHint="search"
          style={{
            flex: 1,
            minWidth: 0,
            background: cores.cardFundo,
            border: `1px solid ${cores.borda}`,
            borderRadius: 14,
            // Espaço à direita reservado para o botão de limpar (X)
            padding: "14px 48px 14px 18px",
            minHeight: 48,
            color: cores.texto,
            // 16px no mínimo: com menos que isso, o Safari do iPhone dá zoom ao tocar no campo
            fontSize: 16,
            outline: "none",
          }}
        />
        {valor && (
          <button
            type="button"
            onClick={limpar}
            aria-label="Limpar busca"
            style={{
              position: "absolute",
              right: 2,
              top: "50%",
              transform: "translateY(-50%)",
              width: 44,
              height: 44,
              background: "transparent",
              border: "none",
              color: cores.textoSecundario,
              fontSize: 22,
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        )}
      </div>
      <button
        type="submit"
        style={{
          background: cores.navy,
          color: cores.navyTexto,
          border: "none",
          borderRadius: 14,
          padding: "14px 24px",
          minHeight: 48,
          fontWeight: 800,
          fontSize: 15,
          cursor: "pointer",
        }}
      >
        Buscar
      </button>
    </form>
  );
}
