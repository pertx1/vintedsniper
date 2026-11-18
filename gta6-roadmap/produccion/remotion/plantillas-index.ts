/**
 * LAS QUINCE PLANTILLAS, con el nombre que se escribe en guion.json.
 *
 * gta-base.tsx no esta aqui a proposito: no es una plantilla, es la paleta,
 * las tipografias y el lienzo que todas comparten.
 */
import GtaAtardecer from "./gta-atardecer";
import GtaBarras from "./gta-barras";
import GtaCapitulo from "./gta-capitulo";
import GtaCita from "./gta-cita";
import GtaDato from "./gta-dato";
import GtaExpediente from "./gta-expediente";
import GtaFicha from "./gta-ficha";
import GtaGrafico from "./gta-grafico";
import GtaLogo from "./gta-logo";
import GtaMarcador from "./gta-marcador";
import GtaPersonaje from "./gta-personaje";
import GtaPlano from "./gta-plano";
import GtaRotulo from "./gta-rotulo";
import GtaSello from "./gta-sello";
import GtaSenal from "./gta-senal";
import GtaSinopsis from "./gta-sinopsis";

export const PLANTILLAS: Record<string, React.FC<any>> = {
  "gta-atardecer": GtaAtardecer,
  "gta-barras": GtaBarras,
  "gta-capitulo": GtaCapitulo,
  "gta-cita": GtaCita,
  "gta-dato": GtaDato,
  "gta-expediente": GtaExpediente,
  "gta-ficha": GtaFicha,
  "gta-grafico": GtaGrafico,
  "gta-logo": GtaLogo,
  "gta-marcador": GtaMarcador,
  "gta-personaje": GtaPersonaje,
  "gta-plano": GtaPlano,
  "gta-rotulo": GtaRotulo,
  "gta-sello": GtaSello,
  "gta-senal": GtaSenal,
  "gta-sinopsis": GtaSinopsis,
};

export const NOMBRES = Object.keys(PLANTILLAS);
