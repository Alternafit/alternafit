import React from "react";
import { cores } from "../styles/theme";

// Endereço do formulário de feedback (ex.: Google Forms), definido na variável
// de ambiente VITE_FEEDBACK_URL. Sem ela, o link simplesmente não aparece.
const LINK_FEEDBACK = import.meta.env.VITE_FEEDBACK_URL ?? "";

/** Aviso da versão de testes, com o link para a pessoa mandar feedback. */
export default function AvisoBeta() {
  return (
    <div
      role="note"
      style={{
        background: cores.orangeTint,
        border: `1px solid ${cores.orange}55`,
        borderRadius: 14,
        padding: "12px 16px",
        marginTop: 18,
        fontSize: 12.5,
        lineHeight: 1.5,
        color: cores.texto,
      }}
    >
      <strong style={{ color: cores.orange }}>Versão de testes.</strong> Algumas informações
      podem estar erradas ou inconsistentes.
      {LINK_FEEDBACK && " Se notar qualquer erro ou problema, nos dê seu feedback pelo link abaixo."}{" "}
      Em caso de dor ou dúvida, procure um profissional.
      {LINK_FEEDBACK && (
        <a
          href={LINK_FEEDBACK}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            marginTop: 8,
            color: cores.orange,
            fontWeight: 800,
            textDecoration: "underline",
            padding: "4px 0",
          }}
        >
          Dê feedback sobre o app →
        </a>
      )}
    </div>
  );
}
