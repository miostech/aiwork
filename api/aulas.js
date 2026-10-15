// Entrega as aulas do curso para quem apresenta um link de acesso válido.
// Usado pela curso.html. As aulas ficam em api/_aulas.js.
import { lerAcesso } from "./_acesso.js";
import { CURSO } from "./_aulas.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Use POST." });
  }

  res.setHeader("Cache-Control", "no-store");
  const acesso = lerAcesso(req.body && req.body.acesso);
  if (!acesso) {
    return res.status(401).json({ erro: "Acesso não encontrado." });
  }
  return res.status(200).json({ curso: CURSO });
}
