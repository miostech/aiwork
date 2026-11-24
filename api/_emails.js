// Modelos e envio dos e-mails da IA Academy e da MIAI Academy (pelo Resend).
// Para mudar o texto ou o visual de um e-mail, edite o html do modelo abaixo.
// Modelos da IA Academy: acesso (Formação IA Academy paga), nova_senha ("Esqueci minha senha") e compra (IA Work comprado).
// Modelos da MIAI: compra_miai (curso comprado), acesso_miai (acesso liberado sem compra) e nova_senha_miai
// ("Esqueci minha senha" na conta da MIAI).
// Campos preenchidos no envio: {{{NOME}}}, {{{EMAIL_ALUNO}}}, {{{SENHA}}}, {{{LINK_CURSO}}} e, na MIAI, {{{CURSO}}}
//
// Variáveis de ambiente:
//   RESEND_API_KEY        chave do Resend (só de envio)
//   EMAIL_REMETENTE       ex.: IA Academy <acesso@iaacademy.bio> (domínio verificado no Resend)
//   EMAIL_REMETENTE_MIAI  opcional, ex.: MIAI Academy <acesso@miaiacademy.com> (domínio verificado no Resend).
//                         Vazio = usa o endereço do EMAIL_REMETENTE com o nome "MIAI Academy".
import { Resend } from "resend";
import { linkMiai } from "./_cursos.js";

const MODELOS = {
  acesso: {
    assunto: "Seu acesso à Formação IA Academy",
    html: `<!doctype html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Seu acesso à Formação IA Academy</title>
<!-- Modelo "acesso-curso" do Resend. Campos: {{{NOME}}}, {{{EMAIL_ALUNO}}}, {{{SENHA}}}, {{{LINK_CURSO}}} -->
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Bitter:wght@500;600&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: 0; background: #FDF6F4; }
  a { color: #B04668; }
  @media (max-width: 600px) {
    .cartao { padding: 28px 20px !important; border-radius: 20px !important; }
    .titulo { font-size: 24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#FDF6F4;">
  <!-- Texto que aparece ao lado do assunto na caixa de entrada -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#FDF6F4;opacity:0;">
    Sua vaga está garantida. Aqui estão o seu e-mail e a sua senha para entrar na área do aluno.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FDF6F4;">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 22px;">
              <span style="font-family:Anton,Impact,'Arial Narrow Bold','Helvetica Neue',Arial,sans-serif;font-size:26px;line-height:1;letter-spacing:0.5px;text-transform:uppercase;color:#2A1D22;">IA <span style="color:#B04668;">Academy</span></span>
            </td>
          </tr>

          <!-- Cartão -->
          <tr>
            <td class="cartao" style="background:#FFFAF8;border:1px solid #F4E1DA;border-radius:28px;padding:36px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- Selo -->
                <tr>
                  <td align="center" style="padding:0 0 18px;">
                    <span style="display:inline-block;background:#F7E0E6;color:#B04668;border-radius:999px;padding:7px 14px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">&#10003; Acesso liberado</span>
                  </td>
                </tr>

                <!-- Título -->
                <tr>
                  <td align="center" class="titulo" style="padding:0 0 14px;font-family:Bitter,Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:500;color:#2A1D22;">
                    Seu acesso está liberado, {{{NOME}}}!
                  </td>
                </tr>

                <!-- Texto -->
                <tr>
                  <td align="center" style="padding:0 0 26px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#6E5A60;">
                    Pagamento confirmado: sua vaga na Formação IA Academy está garantida. Use os dados abaixo para entrar na área do aluno e assistir às aulas.
                  </td>
                </tr>

                <!-- Dados de acesso -->
                <tr>
                  <td style="padding:0 0 26px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #E3C8BF;border-radius:16px;">
                      <tr>
                        <td style="padding:16px 20px 12px;border-bottom:1px solid #F4E1DA;font-family:'DM Sans',Arial,Helvetica,sans-serif;">
                          <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#B04668;padding-bottom:4px;">E-mail</div>
                          <div style="font-size:16px;font-weight:600;color:#2A1D22;word-break:break-all;">{{{EMAIL_ALUNO}}}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 20px 16px;font-family:'DM Sans',Arial,Helvetica,sans-serif;">
                          <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#B04668;padding-bottom:4px;">Senha</div>
                          <div style="font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;font-size:20px;font-weight:700;letter-spacing:2px;color:#2A1D22;">{{{SENHA}}}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Botão -->
                <tr>
                  <td align="center" style="padding:0 0 18px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#B04668" style="border-radius:999px;background:#B04668;background-image:linear-gradient(135deg,#B04668 0%,#D99577 100%);">
                          <a href="{{{LINK_CURSO}}}" target="_blank" style="display:inline-block;padding:16px 34px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;">Acessar o curso &rarr;</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Link alternativo -->
                <tr>
                  <td align="center" style="padding:0 0 26px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#6E5A60;">
                    Se o botão não abrir, copie este endereço no navegador:<br>
                    <a href="{{{LINK_CURSO}}}" target="_blank" style="color:#B04668;word-break:break-all;">{{{LINK_CURSO}}}</a>
                  </td>
                </tr>

                <!-- Aviso -->
                <tr>
                  <td style="background:#FFF6E8;border:1px solid #F2D7A6;border-radius:16px;padding:14px 16px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#7A4A0B;">
                    <strong>Guarde este e-mail.</strong> Ele tem os seus dados de acesso. Se esquecer a senha, use "Esqueci minha senha" na tela de entrada da área do aluno.
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td align="center" style="padding:22px 12px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6E5A60;">
              Você recebeu este e-mail porque garantiu sua vaga na Formação IA Academy.<br>
              &copy; 2026 IA Academy
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`,
  },
  nova_senha: {
    assunto: "Sua nova senha da IA Academy",
    html: `<!doctype html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Sua nova senha da IA Academy</title>
<!-- Modelo "nova-senha" do Resend. Campos: {{{NOME}}}, {{{EMAIL_ALUNO}}}, {{{SENHA}}}, {{{LINK_CURSO}}} -->
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Bitter:wght@500;600&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: 0; background: #FDF6F4; }
  a { color: #B04668; }
  @media (max-width: 600px) {
    .cartao { padding: 28px 20px !important; border-radius: 20px !important; }
    .titulo { font-size: 24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#FDF6F4;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#FDF6F4;opacity:0;">
    Aqui está a sua nova senha para entrar na área do aluno da IA Academy.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FDF6F4;">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <tr>
            <td align="center" style="padding:0 0 22px;">
              <span style="font-family:Anton,Impact,'Arial Narrow Bold','Helvetica Neue',Arial,sans-serif;font-size:26px;line-height:1;letter-spacing:0.5px;text-transform:uppercase;color:#2A1D22;">IA <span style="color:#B04668;">Academy</span></span>
            </td>
          </tr>

          <tr>
            <td class="cartao" style="background:#FFFAF8;border:1px solid #F4E1DA;border-radius:28px;padding:36px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                <tr>
                  <td align="center" style="padding:0 0 18px;">
                    <span style="display:inline-block;background:#F7E0E6;color:#B04668;border-radius:999px;padding:7px 14px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Nova senha</span>
                  </td>
                </tr>

                <tr>
                  <td align="center" class="titulo" style="padding:0 0 14px;font-family:Bitter,Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:500;color:#2A1D22;">
                    Aqui está a sua nova senha, {{{NOME}}}
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:0 0 26px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#6E5A60;">
                    Recebemos um pedido de nova senha para a sua conta na IA Academy. A senha anterior não vale mais: use os dados abaixo para entrar.
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 0 26px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #E3C8BF;border-radius:16px;">
                      <tr>
                        <td style="padding:16px 20px 12px;border-bottom:1px solid #F4E1DA;font-family:'DM Sans',Arial,Helvetica,sans-serif;">
                          <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#B04668;padding-bottom:4px;">E-mail</div>
                          <div style="font-size:16px;font-weight:600;color:#2A1D22;word-break:break-all;">{{{EMAIL_ALUNO}}}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 20px 16px;font-family:'DM Sans',Arial,Helvetica,sans-serif;">
                          <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#B04668;padding-bottom:4px;">Nova senha</div>
                          <div style="font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;font-size:20px;font-weight:700;letter-spacing:2px;color:#2A1D22;">{{{SENHA}}}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:0 0 26px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#B04668" style="border-radius:999px;background:#B04668;background-image:linear-gradient(135deg,#B04668 0%,#D99577 100%);">
                          <a href="{{{LINK_CURSO}}}" target="_blank" style="display:inline-block;padding:16px 34px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;">Entrar na área do aluno &rarr;</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="background:#FFF6E8;border:1px solid #F2D7A6;border-radius:16px;padding:14px 16px;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#7A4A0B;">
                    <strong>Não pediu uma nova senha?</strong> Pode entrar com a senha acima normalmente. Ela foi enviada só para o seu e-mail, então sua conta continua segura.
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:22px 12px 0;font-family:'DM Sans',Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6E5A60;">
              Você recebeu este e-mail porque tem uma conta na IA Academy.<br>
              &copy; 2026 IA Academy
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`,
  },
  compra: {
    assunto: "Seu acesso ao IA Work",
    html: `<!doctype html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Seu acesso ao IA Work</title>
<!-- Modelo "compra" (IA Work, curso pago). Campos: {{{NOME}}}, {{{EMAIL_ALUNO}}}, {{{SENHA}}}, {{{LINK_CURSO}}} -->
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: 0; background: #F5EEE3; }
  a { color: #1E6E4C; }
  @media (max-width: 600px) {
    .cartao { padding: 28px 20px !important; border-radius: 20px !important; }
    .titulo { font-size: 26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F5EEE3;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F5EEE3;opacity:0;">
    Pagamento confirmado. Aqui estão o seu e-mail e a sua senha para assistir ao IA Work.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5EEE3;">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:0 0 22px;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;">
              <span style="font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#18231E;">IA Work</span>
              <span style="font-size:13px;color:#626A64;">&nbsp;por IA Academy</span>
            </td>
          </tr>

          <!-- Cartão -->
          <tr>
            <td class="cartao" style="background:#FBF8F2;border:1px solid #E2D7C4;border-radius:24px;padding:36px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                <tr>
                  <td align="center" style="padding:0 0 18px;">
                    <span style="display:inline-block;background:#E3EFE7;color:#1E6E4C;border-radius:999px;padding:7px 14px;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">&#10003; Pagamento confirmado</span>
                  </td>
                </tr>

                <tr>
                  <td align="center" class="titulo" style="padding:0 0 14px;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:30px;line-height:1.15;font-weight:900;letter-spacing:-0.8px;color:#18231E;">
                    Bem-vindo(a) ao IA Work, {{{NOME}}}!
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:0 0 26px;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#3B443F;">
                    Seu acesso ao IA Work está liberado. Use os dados abaixo para entrar na área do aluno e começar pelo primeiro módulo.
                  </td>
                </tr>

                <!-- Dados de acesso -->
                <tr>
                  <td style="padding:0 0 26px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid #CDBFA6;border-radius:16px;">
                      <tr>
                        <td style="padding:16px 20px 12px;border-bottom:1px solid #E2D7C4;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;">
                          <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#1E6E4C;padding-bottom:4px;">E-mail</div>
                          <div style="font-size:16px;font-weight:600;color:#18231E;word-break:break-all;">{{{EMAIL_ALUNO}}}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 20px 16px;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;">
                          <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#1E6E4C;padding-bottom:4px;">Senha</div>
                          <div style="font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;font-size:20px;font-weight:700;letter-spacing:2px;color:#18231E;">{{{SENHA}}}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Botão -->
                <tr>
                  <td align="center" style="padding:0 0 18px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#1E6E4C" style="border-radius:999px;background:#1E6E4C;">
                          <a href="{{{LINK_CURSO}}}" target="_blank" style="display:inline-block;padding:16px 34px;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;">Acessar o IA Work &rarr;</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:0 0 26px;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#626A64;">
                    Se o botão não abrir, copie este endereço no navegador:<br>
                    <a href="{{{LINK_CURSO}}}" target="_blank" style="color:#1E6E4C;word-break:break-all;">{{{LINK_CURSO}}}</a>
                  </td>
                </tr>

                <tr>
                  <td style="background:#F3ECDF;border:1px solid #E2D7C4;border-radius:16px;padding:14px 16px;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#3B443F;">
                    <strong style="color:#18231E;">Guarde este e-mail.</strong> Ele tem os seus dados de acesso. Se você já era aluno(a) da Formação IA Academy, esta é a sua senha nova e vale para os dois cursos. Se esquecer a senha, use "Esqueci minha senha" na tela de entrada da área do aluno.
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:22px 12px 0;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#626A64;">
              Você recebeu este e-mail porque comprou o IA Work.<br>
              &copy; 2026 IA Academy
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`,
  },
};


// Visual dos e-mails da MIAI Academy (o mesmo do site: papel claro, tinta preta, roxo da marca, botão reto e as fontes
// da IA Academy, Bitter e DM Sans).
// Cada e-mail da MIAI só muda os textos.
function emailMiai({ titulo, previa, selo, chamada, texto, rotuloSenha, botao, nota, rodape }) {
  const fonte = "'DM Sans',Arial,Helvetica,sans-serif";
  const fonteTitulo = "Bitter,Georgia,'Times New Roman',serif";
  const fonteEtiqueta = fonte;   // maiúsculas espaçadas
  const fonteSenha = "'SFMono-Regular',Menlo,Consolas,monospace";
  // Logo roxo publicado no site da MIAI
  const logo = (linkMiai() || "https://www.miaiacademy.com") + "/miai/logo-miai-email.png";
  return `<!doctype html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${titulo}</title>
<link href="https://fonts.googleapis.com/css2?family=Bitter:wght@500;600&family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: 0; background: #F3F1EC; }
  a { color: #5E1D93; }
  @media (max-width: 600px) {
    .cartao { padding: 28px 20px !important; }
    .titulo { font-size: 30px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F3F1EC;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F3F1EC;opacity:0;">
    ${previa}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F1EC;">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td style="padding:0 0 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="${logo}" width="110" height="35" alt="miai" style="display:block;width:110px;height:35px;border:0;outline:none;text-decoration:none;font-family:${fonte};font-size:28px;font-weight:800;color:#5E1D93;">
                  </td>
                  <td style="vertical-align:middle;padding:5px 0 0 10px;font-family:${fonteEtiqueta};font-size:11px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#6A675E;">Academy</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cartão -->
          <tr>
            <td class="cartao" style="background:#FAF9F6;border:1px solid #DCD9D1;padding:36px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                <tr>
                  <td style="padding:0 0 18px;font-family:${fonteEtiqueta};font-size:11px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#6A675E;">
                    <span style="color:#5E1D93;">&#9679;</span>&nbsp; ${selo}
                  </td>
                </tr>

                <tr>
                  <td class="titulo" style="padding:0 0 16px;font-family:${fonteTitulo};font-size:32px;line-height:1.15;font-weight:500;letter-spacing:-0.3px;color:#14130F;">
                    ${chamada}
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 0 26px;font-family:${fonte};font-size:16px;line-height:1.6;color:#6A675E;">
                    ${texto}
                  </td>
                </tr>

                <!-- Dados de acesso -->
                <tr>
                  <td style="padding:0 0 26px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #DCD9D1;border-bottom:1px solid #DCD9D1;">
                      <tr>
                        <td style="padding:16px 0 12px;border-bottom:1px solid #DCD9D1;">
                          <div style="font-family:${fonteEtiqueta};font-size:11px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#6A675E;padding-bottom:4px;">E-mail</div>
                          <div style="font-family:${fonte};font-size:16px;font-weight:500;color:#14130F;word-break:break-all;">{{{EMAIL_ALUNO}}}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0 16px;">
                          <div style="font-family:${fonteEtiqueta};font-size:11px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#6A675E;padding-bottom:4px;">${rotuloSenha}</div>
                          <div style="font-family:${fonteSenha};font-size:22px;font-weight:600;letter-spacing:2px;color:#14130F;">{{{SENHA}}}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Botão -->
                <tr>
                  <td style="padding:0 0 18px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td bgcolor="#14130F" style="background:#14130F;">
                          <a href="{{{LINK_CURSO}}}" target="_blank" style="display:inline-block;padding:15px 28px;font-family:${fonte};font-size:15px;font-weight:500;color:#F3F1EC;text-decoration:none;">${botao} &rarr;</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 0 26px;font-family:${fonte};font-size:13px;line-height:1.5;color:#6A675E;">
                    Se o botão não abrir, copie este endereço no navegador:<br>
                    <a href="{{{LINK_CURSO}}}" target="_blank" style="color:#5E1D93;word-break:break-all;">{{{LINK_CURSO}}}</a>
                  </td>
                </tr>

                <tr>
                  <td style="background:#EFEAF7;border-left:3px solid #5E1D93;padding:14px 16px;font-family:${fonte};font-size:14px;line-height:1.5;color:#2A2823;">
                    ${nota}
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 0 0;font-family:${fonte};font-size:12px;line-height:1.6;color:#6A675E;">
              ${rodape}<br>
              &copy; 2026 MIAI Academy
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

MODELOS.compra_miai = {
  marca: "miai",
  assunto: "Seu acesso ao {{{CURSO}}} na MIAI Academy",
  html: emailMiai({
    titulo: "Seu acesso ao {{{CURSO}}} na MIAI Academy",
    previa: "Pagamento confirmado. Aqui estão o seu e-mail e a sua senha para assistir ao {{{CURSO}}}.",
    selo: "Pagamento confirmado",
    chamada: "Bem-vindo(a) ao {{{CURSO}}}, {{{NOME}}}!",
    texto: "Seu acesso está liberado. Use os dados abaixo para entrar na sua conta da MIAI Academy: o {{{CURSO}}} já aparece lá, junto com os outros cursos que você tiver.",
    rotuloSenha: "Senha",
    botao: "Assistir ao {{{CURSO}}}",
    nota: "<strong style=\"color:#14130F;\">Guarde este e-mail.</strong> Ele tem os seus dados de acesso. Se você já tinha conta na MIAI Academy ou na IA Academy, esta é a sua senha nova e vale para todos os seus cursos. Se esquecer a senha, use \"Esqueci minha senha\" na tela de entrada.",
    rodape: "Você recebeu este e-mail porque comprou o {{{CURSO}}} na MIAI Academy.",
  }),
};

// Acesso dado sem compra (cortesia ou teste): os mesmos dados de login, sem falar em pagamento
MODELOS.acesso_miai = {
  marca: "miai",
  assunto: "Seu acesso ao {{{CURSO}}} na MIAI Academy",
  html: emailMiai({
    titulo: "Seu acesso ao {{{CURSO}}} na MIAI Academy",
    previa: "Seu acesso foi liberado. Aqui estão o seu e-mail e a sua senha para assistir ao {{{CURSO}}}.",
    selo: "Acesso liberado",
    chamada: "Bem-vindo(a) ao {{{CURSO}}}, {{{NOME}}}!",
    texto: "Seu acesso está liberado. Use os dados abaixo para entrar na sua conta da MIAI Academy: o {{{CURSO}}} já aparece lá, junto com os outros cursos que você tiver.",
    rotuloSenha: "Senha",
    botao: "Assistir ao {{{CURSO}}}",
    nota: "<strong style=\"color:#14130F;\">Guarde este e-mail.</strong> Ele tem os seus dados de acesso. Se você já tinha conta na MIAI Academy ou na IA Academy, esta é a sua senha nova e vale para todos os seus cursos. Se esquecer a senha, use \"Esqueci minha senha\" na tela de entrada.",
    rodape: "Você recebeu este e-mail porque o seu acesso ao {{{CURSO}}} foi liberado pela MIAI Academy.",
  }),
};

MODELOS.nova_senha_miai = {
  marca: "miai",
  assunto: "Sua nova senha da MIAI Academy",
  html: emailMiai({
    titulo: "Sua nova senha da MIAI Academy",
    previa: "Aqui está a sua nova senha para entrar na sua conta da MIAI Academy.",
    selo: "Nova senha",
    chamada: "Aqui está a sua nova senha, {{{NOME}}}",
    texto: "Recebemos um pedido de nova senha para a sua conta na MIAI Academy. A senha anterior não vale mais: use os dados abaixo para entrar.",
    rotuloSenha: "Nova senha",
    botao: "Entrar na minha conta",
    nota: "<strong style=\"color:#14130F;\">Não pediu uma nova senha?</strong> Pode entrar com a senha acima normalmente. Ela foi enviada só para o seu e-mail, então sua conta continua segura.",
    rodape: "Você recebeu este e-mail porque tem uma conta na MIAI Academy.",
  }),
};

// ── Editefy: e-mail de quem assina, com a marca do Editefy (sem a MIAI) e o passo a passo para conectar ──
// O endereço do conector (o servidor do Editefy na Hetzner). EDITEFY_CONECTOR, se definida, troca o padrão.
const CONECTOR_EDITEFY = process.env.EDITEFY_CONECTOR || "https://mcp.editefy.com/mcp";

function emailEditefy({ titulo, previa, chamada, texto, rotuloSenha, passos = [], tituloPassos = "Como conectar", botao, nota, rodape }) {
  const fonte = "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif";
  const fonteSenha = "'SFMono-Regular',Menlo,Consolas,monospace";
  const linhaPasso = (n, html) => `
                      <tr>
                        <td width="34" style="vertical-align:top;padding:0 0 14px;">
                          <div style="width:26px;height:26px;border-radius:8px;background:#7C3AED;color:#FFFFFF;font-family:${fonte};font-size:14px;font-weight:700;line-height:26px;text-align:center;">${n}</div>
                        </td>
                        <td style="vertical-align:top;padding:2px 0 14px;font-family:${fonte};font-size:15px;line-height:1.55;color:#3F3A4D;">${html}</td>
                      </tr>`;
  return `<!doctype html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${titulo}</title>
<style>
  body { margin: 0; padding: 0; background: #F4F2FA; }
  a { color: #6D28D9; }
  @media (max-width: 600px) { .cartao { padding: 28px 20px !important; } .titulo { font-size: 26px !important; } }
</style>
</head>
<body style="margin:0;padding:0;background:#F4F2FA;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F4F2FA;opacity:0;">
    ${previa}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F2FA;">
    <tr>
      <td align="center" style="padding:32px 16px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <tr>
            <td style="padding:0 0 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="width:32px;height:32px;border-radius:9px;background:#7C3AED;color:#FFFFFF;font-family:${fonte};font-size:16px;line-height:32px;text-align:center;">&#9654;</div>
                  </td>
                  <td style="vertical-align:middle;padding:0 0 0 10px;font-family:${fonte};font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#17141F;">Editefy</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="cartao" style="background:#FFFFFF;border:1px solid #E4E0EE;border-radius:18px;padding:36px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="titulo" style="padding:0 0 14px;font-family:${fonte};font-size:28px;line-height:1.2;font-weight:800;letter-spacing:-0.5px;color:#17141F;">${chamada}</td>
                </tr>
                <tr>
                  <td style="padding:0 0 22px;font-family:${fonte};font-size:16px;line-height:1.6;color:#625B73;">${texto}</td>
                </tr>
${rotuloSenha ? `
                <tr>
                  <td style="padding:0 0 26px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F2FA;border-radius:14px;">
                      <tr>
                        <td style="padding:18px 20px 6px;font-family:${fonte};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#625B73;">E-mail</td>
                      </tr>
                      <tr>
                        <td style="padding:0 20px 14px;font-family:${fonteSenha};font-size:16px;color:#17141F;word-break:break-all;">{{{EMAIL_ALUNO}}}</td>
                      </tr>
                      <tr>
                        <td style="padding:0 20px 6px;font-family:${fonte};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#625B73;">${rotuloSenha}</td>
                      </tr>
                      <tr>
                        <td style="padding:0 20px 18px;font-family:${fonteSenha};font-size:18px;font-weight:700;color:#17141F;">{{{SENHA}}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
` : ""}
${passos.length ? `
                <tr>
                  <td style="padding:0 0 12px;font-family:${fonte};font-size:17px;font-weight:800;color:#17141F;">${tituloPassos}</td>
                </tr>
                <tr>
                  <td style="padding:0 0 10px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${passos.map((t, i) => linhaPasso(i + 1, t)).join("")}
                    </table>
                  </td>
                </tr>` : ""}
                <tr>
                  <td style="padding:0 0 26px;">
                    <a href="{{{LINK_CURSO}}}" style="display:inline-block;background:#7C3AED;color:#FFFFFF;text-decoration:none;font-family:${fonte};font-size:16px;font-weight:700;padding:14px 24px;border-radius:12px;">${botao}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 0 0;border-top:1px solid #E4E0EE;font-family:${fonte};font-size:14px;line-height:1.6;color:#625B73;">${nota}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 4px 0;font-family:${fonte};font-size:12px;line-height:1.6;color:#8A8399;">${rodape}<br>&copy; 2026 Editefy</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

MODELOS.compra_editefy = {
  marca: "editefy",
  assunto: "Seu acesso ao Editefy",
  html: emailEditefy({
    titulo: "Seu acesso ao Editefy",
    previa: "Seus {{{MINUTOS}}} minutos estão prontos. Veja como conectar o Editefy ao seu Claude, ChatGPT ou Grok em um minuto.",
    chamada: "Bem-vindo(a) ao Editefy, {{{NOME}}}!",
    texto: "Seus <strong>{{{MINUTOS}}} minutos</strong> de vídeo já estão na sua conta e valem 12 meses. Para começar, conecte o Editefy e entre com os dados abaixo. Os passos são do Claude; se você usa o ChatGPT ou o Grok, o botão no fim mostra o passo a passo deles.",
    rotuloSenha: "Senha",
    passos: [
      "No app do Claude (ou em claude.ai), abra <strong>Configurações &rarr; Conectores</strong> e toque em <strong>Adicionar conector personalizado</strong>.",
      `Em nome, escreva <strong>Editefy</strong>. Em endereço, cole:<br><span style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:13px;color:#17141F;word-break:break-all;">${CONECTOR_EDITEFY}</span>`,
      "Toque em <strong>Conectar</strong> e entre com o e-mail e a senha acima.",
      "Numa conversa nova, escreva: <strong>Quero editar um Reels com o Editefy</strong>.",
    ],
    botao: "Ver o passo a passo",
    nota: "<strong style=\"color:#17141F;\">Guarde este e-mail.</strong> Ele tem os seus dados de acesso. Quando os minutos acabarem, é só comprar outro pacote em editefy.com.",
    rodape: "Você recebeu este e-mail porque comprou minutos do Editefy.",
  }),
};

// Quem já tem conta e compra mais um pacote: sem senha (continua a mesma)
MODELOS.minutos_editefy = {
  marca: "editefy",
  assunto: "Seus minutos do Editefy chegaram",
  html: emailEditefy({
    titulo: "Seus minutos do Editefy chegaram",
    previa: "{{{MINUTOS}}} minutos a mais na sua conta do Editefy.",
    chamada: "Seus minutos chegaram, {{{NOME}}}!",
    texto: "Os <strong>{{{MINUTOS}}} minutos</strong> que você comprou já estão na sua conta, somados ao que você tinha, e valem 12 meses. É só pedir na conversa: <strong>Quero editar um Reels com o Editefy</strong>. Para ver o saldo, pergunte: <strong>quantos minutos eu tenho no Editefy?</strong>",
    botao: "Ver como conectar",
    nota: "Sua senha continua a mesma. Se não lembrar, peça uma nova em <a href=\"https://www.editefy.com/conta\" style=\"color:#7C3AED;\">editefy.com/conta</a>.",
    rodape: "Você recebeu este e-mail porque comprou minutos do Editefy.",
  }),
};

MODELOS.nova_senha_editefy = {
  marca: "editefy",
  assunto: "Sua nova senha do Editefy",
  html: emailEditefy({
    titulo: "Sua nova senha do Editefy",
    previa: "Aqui está a sua nova senha para conectar o Editefy.",
    chamada: "Aqui está a sua nova senha, {{{NOME}}}",
    texto: "Recebemos um pedido de nova senha. A senha anterior não vale mais: use os dados abaixo quando o Editefy pedir para entrar.",
    rotuloSenha: "Nova senha",
    botao: "Ver como conectar",
    nota: "<strong style=\"color:#17141F;\">Não pediu uma nova senha?</strong> Pode usar a senha acima normalmente. Ela foi enviada só para o seu e-mail, então a sua conta continua segura.",
    rodape: "Você recebeu este e-mail porque tem uma conta no Editefy.",
  }),
};

// ── Editefy Sort: e-mail de quem compra o acesso de 12 meses, com a marca do Editefy e o passo a passo para conectar ──
// O endereço do conector do Sort (outro serviço no mesmo servidor). EDITEFY_SORT_CONECTOR, se definida, troca o padrão.
const CONECTOR_SORT = process.env.EDITEFY_SORT_CONECTOR || "https://sort.editefy.com/mcp";
const passosSort = (entrar) => [
  "No app do Claude (ou em claude.ai), abra <strong>Configurações &rarr; Conectores</strong> e toque em <strong>Adicionar conector personalizado</strong>.",
  `Em nome, escreva <strong>Editefy Sort</strong>. Em endereço, cole:<br><span style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:13px;color:#17141F;word-break:break-all;">${CONECTOR_SORT}</span>`,
  `Toque em <strong>Conectar</strong> e ${entrar}.`,
  "Numa conversa nova, escreva: <strong>Quero organizar minhas fotos com o Editefy Sort</strong>.",
];

MODELOS.compra_editefy_sort = {
  marca: "editefy",
  assunto: "Seu acesso ao Editefy Sort",
  html: emailEditefy({
    titulo: "Seu acesso ao Editefy Sort",
    previa: "Seu Editefy Sort está liberado até {{{VENCE}}}. Veja como conectar no Claude em um minuto.",
    chamada: "Bem-vindo(a) ao Editefy Sort, {{{NOME}}}!",
    texto: "Seu acesso está liberado até <strong>{{{VENCE}}}</strong>. Nesse tempo, organize quantas pilhas de vídeos, fotos e áudios quiser. Para começar, conecte o Editefy Sort e entre com os dados abaixo. Os passos são do Claude; se você usa o ChatGPT ou o Grok, o botão no fim mostra o passo a passo deles.",
    rotuloSenha: "Senha",
    passos: passosSort("entre com o e-mail e a senha acima"),
    botao: "Ver o passo a passo",
    nota: "<strong style=\"color:#17141F;\">Guarde este e-mail.</strong> Ele tem os seus dados de acesso. Quando o acesso estiver perto de acabar, é só renovar em editefy.com.",
    rodape: "Você recebeu este e-mail porque comprou o Editefy Sort.",
  }),
};

// Quem já tem conta (no Editefy ou na escola) e compra ou renova o Sort: sem senha (continua a mesma)
MODELOS.acesso_editefy_sort = {
  marca: "editefy",
  assunto: "Seu Editefy Sort está liberado",
  html: emailEditefy({
    titulo: "Seu Editefy Sort está liberado",
    previa: "Seu acesso ao Editefy Sort vai até {{{VENCE}}}.",
    chamada: "Seu Editefy Sort está liberado, {{{NOME}}}!",
    texto: "Seu acesso vai até <strong>{{{VENCE}}}</strong>. Se você renovou antes de acabar, os 12 meses foram somados ao tempo que ainda faltava. Para entrar, use o e-mail <strong>{{{EMAIL_ALUNO}}}</strong> e a senha que você já tem.",
    passos: passosSort("entre com o seu e-mail e a senha de sempre"),
    botao: "Ver o passo a passo",
    nota: "Sua senha continua a mesma. Se não lembrar, peça uma nova em <a href=\"https://www.editefy.com/conta\" style=\"color:#7C3AED;\">editefy.com/conta</a>.",
    rodape: "Você recebeu este e-mail porque comprou o Editefy Sort.",
  }),
};

// ── Editefy Sort para computador: e-mail de quem compra o plugin, com a marca do Editefy e os dois comandos de
// instalação (a loja "editefy", em editefy.com, com a licença da pessoa: {{{COMANDO_LOJA}}} e {{{COMANDO_INSTALAR}}}) ──
const comandoEmail = (campo) =>
  `<span style="display:block;margin-top:6px;padding:10px 12px;border-radius:10px;background:#F4F2FA;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:13px;color:#17141F;word-break:break-all;">{{{${campo}}}}</span>`;
const passosSortComputador = [
  "Abra o <strong>Claude Code</strong> no seu Mac ou Windows: o app do Claude para desktop, na aba <strong>Code</strong>, ou o terminal.",
  `Cole este comando e aperte Enter:${comandoEmail("COMANDO_LOJA")}`,
  `Depois cole este:${comandoEmail("COMANDO_INSTALAR")}`,
  "Feche e abra o Claude Code. Jogue os arquivos na pasta <strong>Organizar</strong> (Área de Trabalho &rarr; Editefy Sort) e escreva: <strong>organiza</strong>. Na primeira vez, ele instala o que faltar no computador (leva alguns minutos).",
];
const notaSortComputador = "<strong style=\"color:#17141F;\">Guarde este e-mail.</strong> Os comandos são pessoais e valem para 1 computador: não compartilhe. Se eles forem usados em outro computador ou compartilhados, o acesso pode ser desativado.";

MODELOS.compra_editefy_sort_computador = {
  marca: "editefy",
  assunto: "Seu Editefy Sort para computador",
  html: emailEditefy({
    titulo: "Seu Editefy Sort para computador",
    previa: "Seu Editefy Sort para computador está liberado. Cole os dois comandos no Claude Code para instalar.",
    chamada: "Bem-vindo(a) ao Editefy Sort, {{{NOME}}}!",
    texto: "Seu Editefy Sort para computador está liberado, para sempre. Ele roda no Claude Code do seu Mac ou Windows e os arquivos não saem do computador. Para instalar, siga os passos abaixo. Junto, criamos a sua conta da Editefy, que serve para os outros produtos dela:",
    rotuloSenha: "Senha",
    passos: passosSortComputador,
    tituloPassos: "Como instalar",
    botao: "Ver o passo a passo",
    nota: notaSortComputador,
    rodape: "Você recebeu este e-mail porque comprou o Editefy Sort para computador.",
  }),
};

// Quem já tem conta (no Editefy ou na escola): sem senha (continua a mesma)
MODELOS.acesso_editefy_sort_computador = {
  marca: "editefy",
  assunto: "Seu Editefy Sort para computador está liberado",
  html: emailEditefy({
    titulo: "Seu Editefy Sort para computador está liberado",
    previa: "Seu Editefy Sort para computador está liberado. Cole os dois comandos no Claude Code para instalar.",
    chamada: "Seu Editefy Sort está liberado, {{{NOME}}}!",
    texto: "Seu Editefy Sort para computador está liberado, para sempre. Ele roda no Claude Code do seu Mac ou Windows e os arquivos não saem do computador. Para instalar, siga os passos abaixo.",
    passos: passosSortComputador,
    tituloPassos: "Como instalar",
    botao: "Ver o passo a passo",
    nota: notaSortComputador,
    rodape: "Você recebeu este e-mail porque comprou o Editefy Sort para computador.",
  }),
};

const REMETENTE = process.env.EMAIL_REMETENTE || "IA Academy <onboarding@resend.dev>";
// Mesmo endereço, com o nome da MIAI, enquanto o domínio da MIAI não estiver verificado no Resend
const REMETENTE_MIAI = process.env.EMAIL_REMETENTE_MIAI || "MIAI Academy <" + (REMETENTE.match(/<([^>]+)>/) || [null, REMETENTE])[1] + ">";
// O Editefy manda do próprio domínio, verificado no Resend (EMAIL_REMETENTE_EDITEFY, se definida, troca o padrão)
const REMETENTE_EDITEFY = process.env.EMAIL_REMETENTE_EDITEFY || "Editefy <contato@editefy.com>";
let resend = null;

function cliente() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) throw new Error("Defina RESEND_API_KEY nas variáveis de ambiente.");
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

function escapar(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// tipo: um dos MODELOS acima. idempotencia: chave única por tentativa de envio (evita e-mail duplicado).
// Devolve { ok: true, id } ou { ok: false, erro }. Nunca lança erro.
export async function enviarEmail(tipo, para, dados, idempotencia) {
  const modelo = MODELOS[tipo];
  const html = modelo.html.replace(/\{\{\{(\w+)\}\}\}/g, (_, campo) => escapar(dados[campo]));
  const assunto = modelo.assunto.replace(/\{\{\{(\w+)\}\}\}/g, (_, campo) => String(dados[campo] ?? ""));
  const remetente = modelo.marca === "editefy" ? REMETENTE_EDITEFY : modelo.marca === "miai" ? REMETENTE_MIAI : REMETENTE;
  try {
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      const { data, error, headers } = await cliente().emails.send(
        { from: remetente, to: [para], subject: assunto, html },
        { idempotencyKey: idempotencia }
      );
      if (!error) {
        console.log(`E-mail "${tipo}" enviado: ${data.id}`);
        return { ok: true, id: data.id };
      }
      const status = error.statusCode || 0;
      console.error(`Falha ao enviar o e-mail "${tipo}" (${status}): ${error.message}`);
      // Só tenta de novo em erro de rede, limite de envios (429) ou erro do Resend (5xx)
      if (!(status === 0 || status === 429 || status >= 500) || tentativa === 3) {
        return { ok: false, erro: error.message };
      }
      const aguardar = Number(headers && headers["retry-after"]) * 1000 || 500 * 2 ** (tentativa - 1);
      await esperar(Math.min(aguardar, 4000));
    }
  } catch (erro) {
    console.error(`Erro ao enviar o e-mail "${tipo}":`, erro);
    return { ok: false, erro: String(erro.message || erro) };
  }
  return { ok: false, erro: "não enviado" };
}
