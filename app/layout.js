import "./globals.css";

export const metadata = {
  title: "PRIME - Painel do Cliente",
  description: "Sistema oficial de autenticação, resgate de chaves e produtos PRIME Free Fire",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800;900&family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script src="https://unpkg.com/lucide@latest"></script>
      </head>
      <body className="theme-blue">{children}</body>

    </html>
  );
}
