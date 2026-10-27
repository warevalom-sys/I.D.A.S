const P = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export default function VehicleIcon({ tipo, size = 24 }) {
  if (tipo === "carro") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" {...P}>
        <path d="M3 13l1.5-4.5A2 2 0 016.4 7h11.2a2 2 0 011.9 1.5L21 13v5a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H6v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-5z" />
        <circle cx="7" cy="17" r="1.5" />
        <circle cx="17" cy="17" r="1.5" />
      </svg>
    );
  }
  if (tipo === "motocicleta") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" {...P}>
        <circle cx="5" cy="17" r="3" />
        <circle cx="19" cy="17" r="3" />
        <path d="M5 17l3-6h5l3 6M8 11l-1-3H5M13 11l2-4h3" />
      </svg>
    );
  }
  // bicicleta (por defecto)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...P}>
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6a1 1 0 100-2 1 1 0 000 2zM12 17.5V14l-3-3 4-3 2 3h3" />
    </svg>
  );
}