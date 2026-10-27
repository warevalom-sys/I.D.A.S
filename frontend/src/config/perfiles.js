import { ROUTES } from "../Routes";

/* Un perfil por tipo de usuario. Aquí se decide qué ve cada uno:
   modo principal, textos del botón de inicio y consejo de seguridad.
   Carro y motocicleta comparten el modo "vehicular"; bicicleta usa el suyo. */
export const PERFILES = {
  bicicleta: {
    id: "bicicleta",
    label: "Bicicleta",
    route: ROUTES.EXP_BICICLETA,
    menuKey: "sidebar.menu.bicicleta",
    bottomKey: "sidebar.bottomNav.bicicleta",
    titleKey: "camera.mode.bicicleta.title",
    descKey: "dashboard.mode.bicicleta.desc",
    cta: "Empezar recorrido",
    tip: "En este modo las alertas se avisan con sonido. Sube el volumen antes de salir.",
    otro: "carro",
  },
  carro: {
    id: "carro",
    label: "Carro",
    route: ROUTES.SIM_VEHICULAR,
    menuKey: "sidebar.menu.simVehicular",
    bottomKey: "sidebar.bottomNav.vehicular",
    titleKey: "camera.mode.vehicular.title",
    descKey: "dashboard.mode.vehicular.desc",
    cta: "Empezar a conducir",
    tip: "Fija bien el celular y deja la cámara despejada antes de arrancar.",
    otro: "bicicleta",
  },
  motocicleta: {
    id: "motocicleta",
    label: "Motocicleta",
    route: ROUTES.SIM_VEHICULAR,
    menuKey: "sidebar.menu.simVehicular",
    bottomKey: "sidebar.bottomNav.vehicular",
    titleKey: "camera.mode.vehicular.title",
    descKey: "dashboard.mode.vehicular.desc",
    cta: "Empezar a rodar",
    tip: "Asegura bien el celular y deja la cámara despejada antes de arrancar.",
    otro: "bicicleta",
  },
};

/* Deduce el tipo de usuario a partir de lo que devuelve el backend.
   Si el backend manda el tipo (tipo_vehiculo, vehiculo.tipo o tipo) se usa;
   si no, se cae a modo_preferido: "ciclista" → bicicleta, lo demás → carro. */
export function resolverTipo(datos) {
  const raw = String(datos?.tipo_vehiculo ?? datos?.vehiculo?.tipo ?? datos?.tipo ?? "").toLowerCase();
  if (raw.startsWith("moto")) return "motocicleta";
  if (raw.startsWith("bici")) return "bicicleta";
  if (raw === "carro" || raw === "auto") return "carro";
  return datos?.modo_preferido === "ciclista" ? "bicicleta" : "carro";
}

export const perfilDe = (user) => PERFILES[user?.tipoVehiculo] || PERFILES.bicicleta;

/* Si una clave de traducción aún no existe, usa el texto de respaldo
   (así no se ve "dashboard.startCta" en pantalla). */
export const tr = (t, key, fallback) => {
  const v = t(key);
  return v && v !== key ? v : fallback;
};