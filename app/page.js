"use client";

import { useState, useEffect } from "react";

const DISCORD_INVITE = "https://discord.gg/RHwSMM6azb";
const DEFAULT_WEBHOOK_URL = "https://discord.com/api/webhooks/1536387844598403154/VjJ9CKGIw90vMiuoedk8nK9X2XSg-Fa9kLrfoxVJDaEUCK2-0uHvRXk0wLqkDoNIBVOb";

export default function Home() {
  // Page Mode: "landing" | "login" | "register" | "dashboard"
  const [viewMode, setViewMode] = useState("landing");

  // User session state
  const [userSession, setUserSession] = useState(null);
  const [currentTab, setCurrentTab] = useState("inicio"); // inicio, loja, meus-produtos, downloads, faturas, perfil, admin-keys, admin-products, admin-logs
  const [activeModal, setActiveModal] = useState(null);

  // Form states
  const [authUser, setAuthUser] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authConfirmPass, setAuthConfirmPass] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0); // Index of open FAQ item

  // Profile Form states
  const [profUser, setProfUser] = useState("");
  const [profEmail, setProfEmail] = useState("");
  const [passCurrent, setPassCurrent] = useState("");
  const [passNew, setPassNew] = useState("");
  const [passConfirm, setPassConfirm] = useState("");

  // Custom PRIME MENU download link & IP Release states
  const [primeMenuDownloadUrl, setPrimeMenuDownloadUrl] = useState("https://discord.gg/RHwSMM6azb");
  const [ipReleaseInput, setIpReleaseInput] = useState("");
  const [ipClientName, setIpClientName] = useState("");
  const [releasedIps, setReleasedIps] = useState([
    { ip: "192.168.18.6", client: "Cliente Demonstração", link: "http://192.168.18.6:5000/", date: "10/08/2026" },
  ]);


  const [genProduct, setGenProduct] = useState("PRIME EXTREMER");
  const [genDays, setGenDays] = useState(30);
  const [genAmount, setGenAmount] = useState(1);
  const [batchKeysResult, setBatchKeysResult] = useState(null);

  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdUrl, setNewProdUrl] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");
  const [logsList, setLogsList] = useState([
    { id: "l-1", timestamp: "10/08/2026 12:00", type: "SISTEMA", detail: "Sistema PRIME inicializado com sucesso." },
  ]);
  const [keysList, setKeysList] = useState([
    { code: "PRIME-892A-33FF", productName: "PRIME MENU FREE FIRE", durationDays: 30, status: "UNUSED", redeemedBy: null, banned: false, paused: false },
    { code: "PRIME-7718-PERM", productName: "PRIME MENU FREE FIRE", durationDays: 9999, status: "UNUSED", redeemedBy: null, banned: false, paused: false },
  ]);

  // Helper for localStorage persistence
  const saveStorage = (k, val) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(k, JSON.stringify(val));
      }
    } catch (e) {}
  };

  const loadStorage = (k, defaultVal) => {
    try {
      if (typeof window !== "undefined") {
        const item = localStorage.getItem(k);
        if (item) return JSON.parse(item);
      }
    } catch (e) {}
    return defaultVal;
  };

  const downloadTxt = (codesList) => {
    if (!codesList || codesList.length === 0) return;
    const content = codesList.join("\r\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PRIME_KEYS_BATCH_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Arquivo .TXT baixado com sucesso!");
  };

  const handleBanKey = async (code, currentBanned) => {
    const newBanned = !currentBanned;
    try {
      await fetch("/api/ban-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret: "adryel1104", key: code, banned: newBanned, reason: newBanned ? "Banido pelo Admin" : "" }),
      });
    } catch (e) {}
    setKeysList((prev) => {
      const updated = prev.map((k) => (k.code === code ? { ...k, banned: newBanned, status: newBanned ? "BANIDA" : "UNUSED" } : k));
      saveStorage("prime_keys_list", updated);
      return updated;
    });
    showToast(newBanned ? `Key ${code} banida!` : `Key ${code} desbanida!`);
  };

  const handlePauseKey = async (code, currentPaused) => {
    const newPaused = !currentPaused;
    try {
      await fetch("/api/pause-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret: "adryel1104", key: code, paused: newPaused }),
      });
    } catch (e) {}
    setKeysList((prev) => {
      const updated = prev.map((k) => (k.code === code ? { ...k, paused: newPaused, status: newPaused ? "PAUSADA" : "UNUSED" } : k));
      saveStorage("prime_keys_list", updated);
      return updated;
    });
    showToast(newPaused ? `Key ${code} pausada!` : `Key ${code} ativada!`);
  };

  const handleResetKeyHWID = async (code) => {
    try {
      await fetch("/api/reset-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret: "adryel1104", key: code }),
      });
    } catch (e) {}
    setKeysList((prev) => {
      const updated = prev.map((k) => (k.code === code ? { ...k, activations: [] } : k));
      saveStorage("prime_keys_list", updated);
      return updated;
    });
    showToast(`HWID da key ${code} resetado!`);
  };

  const handleDeleteKey = async (code) => {
    if (!confirm(`Deletar a key ${code}?`)) return;
    try {
      await fetch("/api/delete-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret: "adryel1104", key: code }),
      });
    } catch (e) {}
    setKeysList((prev) => {
      const updated = prev.filter((k) => k.code !== code);
      saveStorage("prime_keys_list", updated);
      return updated;
    });
    showToast(`Key ${code} removida!`);
  };

  const [productsList, setProductsList] = useState([
    {
      id: "p-prime-extremer",
      name: "PRIME EXTREMER",
      category: "Free Fire / Emulator",
      badge: "LANÇAMENTO",
      price: "DISCORD VIP",
      description: "Painel Prime Extremer com Aimbot 360°, ESP Box, Line, Skeleton, Burst Fire de 4 níveis, Ghost Hack e integração com Discord.",
      tags: ["INTERNAL", "AIMBOT 360", "ESP TEXT", "BURST FIRE", "DISCORD SYNC"],
      downloadUrl: "https://discord.gg/RHwSMM6azb",
    },
    {
      id: "p-ff-menu",
      name: "PRIME MENU FREE FIRE",
      category: "Free Fire",
      badge: "EXCLUSIVO",
      price: "COMPRAR VIA DISCORD",
      description: "Painel completo Free Fire com Aimbot 360°, ESP Line, Box, Skeleton, Fast Reload, Bypass HWID e Anti-ban de última geração.",
      tags: ["BYPASS", "AIMBOT", "ESP", "DESBAN"],
      downloadUrl: "https://discord.gg/RHwSMM6azb",
    },
  ]);



  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  useEffect(() => {
    // 1. Restore local storage items
    const savedKeys = loadStorage("prime_keys_list", null);
    if (savedKeys && Array.isArray(savedKeys) && savedKeys.length > 0) {
      setKeysList(savedKeys);
    }
    const savedIps = loadStorage("prime_released_ips", null);
    if (savedIps && Array.isArray(savedIps)) {
      setReleasedIps(savedIps);
    }
    const savedUrl = loadStorage("prime_download_url", null);
    if (savedUrl) {
      setPrimeMenuDownloadUrl(savedUrl);
    }
    const savedSession = loadStorage("prime_user_session", null);
    if (savedSession) {
      setUserSession(savedSession);
    }

    // 2. Fetch remote keys from server API
    fetch("/api/list-keys")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.keys) && data.keys.length > 0) {
          setKeysList((prev) => {
            const map = new Map();
            data.keys.forEach((k) => map.set(k.code, k));
            prev.forEach((k) => {
              if (!map.has(k.code)) map.set(k.code, k);
            });
            const merged = Array.from(map.values());
            saveStorage("prime_keys_list", merged);
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (userSession) {
      setProfUser(userSession.username || "");
      setProfEmail(userSession.email || "");
      setViewMode("dashboard");
      saveStorage("prime_user_session", userSession);
    }
  }, [userSession]);

  // Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: authUser, password: authPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Usuário ou senha incorretos");

      setUserSession(data.user);
      saveStorage("prime_user_session", data.user);
      showToast(`Bem-vindo ao PRIME, ${data.user.username}!`);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Register (No key required!)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");

    if (authPass !== authConfirmPass) {
      setAuthError("As senhas digitadas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: authUser, email: authEmail, password: authPass }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao criar conta");

      setUserSession(data.user);
      saveStorage("prime_user_session", data.user);
      showToast("Conta criada com sucesso! Você já está conectado.");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setUserSession(null);
    saveStorage("prime_user_session", null);
    setViewMode("landing");
    showToast("Você saiu da sua conta.");
  };

  // Key Redemption
  const handleRedeemSubmit = async (e) => {
    e.preventDefault();
    const cleanCode = redeemCodeInput.trim();
    if (!cleanCode) return;

    if (!userSession || !userSession.username) {
      setActiveModal(null);
      setViewMode("login");
      showToast("Por favor, faça login ou crie uma conta para resgatar sua chave.");
      return;
    }

    setLoading(true);
    try {
      let data = null;
      let redeemedProdName = "PRIME MENU FREE FIRE";

      try {
        const res = await fetch("/api/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: userSession.username, keyCode: cleanCode }),
        });
        const apiData = await res.json();
        if (res.ok && apiData.ok) {
          data = apiData;
          redeemedProdName = apiData.productName || "PRIME MENU FREE FIRE";
        } else {
          throw new Error(apiData?.error || "Chave inválida ou não encontrada.");
        }
      } catch (apiErr) {
        // Fallback: check keysList in state
        const idx = keysList.findIndex((k) => k.code.toUpperCase() === cleanCode.toUpperCase());
        if (idx !== -1) {
          const targetKey = keysList[idx];
          if (targetKey.banned) throw new Error("Esta chave está banida.");
          if (targetKey.paused) throw new Error("Esta chave está pausada.");
          if (targetKey.status === "USED" || targetKey.redeemedBy) throw new Error("Esta chave já foi resgatada.");

          const updatedKeys = [...keysList];
          updatedKeys[idx] = {
            ...targetKey,
            status: "USED",
            redeemedBy: userSession.username,
          };
          setKeysList(updatedKeys);
          saveStorage("prime_keys_list", updatedKeys);
          redeemedProdName = targetKey.productName || "PRIME MENU FREE FIRE";
        } else {
          throw apiErr;
        }
      }

      const existingProducts = userSession.products || [];
      const existingInvoices = userSession.invoices || [];

      const newProduct = {
        productName: redeemedProdName,
        keyCode: cleanCode,
        downloadUrl: primeMenuDownloadUrl || "https://discord.gg/RHwSMM6azb",
        redeemedAt: new Date().toLocaleDateString("pt-BR"),
      };

      const newInvoice = {
        id: "INV-" + Math.floor(100000 + Math.random() * 900000),
        productName: redeemedProdName,
        keyCode: cleanCode,
        date: new Date().toLocaleDateString("pt-BR"),
      };

      const updatedSession = {
        ...userSession,
        products: data?.user?.products || [newProduct, ...existingProducts],
        invoices: data?.user?.invoices || [newInvoice, ...existingInvoices],
      };

      setUserSession(updatedSession);
      saveStorage("prime_user_session", updatedSession);
      setActiveModal(null);
      setRedeemCodeInput("");
      showToast(`Parabéns! O produto "${redeemedProdName}" foi ativado na sua conta!`);
    } catch (err) {
      showToast(err.message || "Erro ao resgatar chave");
    } finally {
      setLoading(false);
    }
  };


  const handleProfileSave = (e) => {
    e.preventDefault();
    setUserSession((prev) => ({ ...prev, username: profUser, email: profEmail }));
    showToast("Perfil atualizado com sucesso!");
  };

  const handlePasswordSave = (e) => {
    e.preventDefault();
    if (passNew !== passConfirm) {
      showToast("A nova senha e a confirmação não coincidem.");
      return;
    }
    setPassCurrent("");
    setPassNew("");
    setPassConfirm("");
    showToast("Senha alterada com sucesso!");
  };

  const handleHWIDReset = () => {
    if (userSession.hwidResetsUsed >= userSession.hwidResetsMax) {
      showToast("Você atingiu o limite de resets de HWID deste mês.");
      return;
    }
    setUserSession((prev) => ({
      ...prev,
      hwidResetsUsed: prev.hwidResetsUsed + 1,
      hwid: "HWID-RESET-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    }));
    showToast("HWID desvinculado e resetado com sucesso!");
  };

  const copyText = (txt) => {
    navigator.clipboard.writeText(txt);
    showToast(`Copiado: ${txt}`);
  };

  // FAQ Items Data (Image 1)
  const faqItems = [
    {
      q: "É seguro usar?",
      a: "Sim. DMA, drivers assinados pela Microsoft e código ofuscado com atualização diária. Testamos antes de cada patch.",
    },
    {
      q: "Como funciona a entrega?",
      a: "A entrega é 100% automática instantaneamente após a confirmação via Pix ou resgate de chave no painel.",
    },
    {
      q: "Funciona no meu PC?",
      a: "Sim, nossas ferramentas são compatíveis com Windows 10 e Windows 11 (todas as versões recentes), tanto em Intel quanto em AMD.",
    },
    {
      q: "E se o jogo atualizar?",
      a: "Nossa equipe realiza atualizações de bypass antes ou minutos após qualquer atualização do jogo ser lançada.",
    },
    {
      q: "Posso usar em stream?",
      a: "Sim! Possuímos proteção total contra captura de tela OBS, Discord, Twitch e programas de gravação.",
    },
  ];

  // --------------------------------------------------------------------------
  // 1. PUBLIC LANDING PAGE (Exact match of zimobr.com Screenshots 1, 2, 3)
  // --------------------------------------------------------------------------
  if (viewMode === "landing" && !userSession) {
    return (
      <div style={{ background: "var(--bg-darker)", minHeight: "100vh", color: "#fff" }}>
        {/* LANDING HEADER */}
        <header className="landing-header">
          <div className="logo-box">
            <div className="logo-icon">⚡</div>
            <div className="logo-text">PRIME</div>
          </div>

          <nav className="landing-nav">
            <a href="#produtos" className="landing-nav-link">
              Produtos
            </a>
            <a href="#recursos" className="landing-nav-link">
              Recursos
            </a>
            <a href="#faq" className="landing-nav-link">
              FAQ
            </a>
          </nav>

          <div className="landing-auth-buttons">
            <button className="btn-auth-login" onClick={() => setViewMode("login")}>
              Entrar
            </button>
            <button className="btn-auth-register" onClick={() => setViewMode("register")}>
              Registrar
            </button>
          </div>
        </header>

        {/* HERO SECTION (Image 3) */}
        <section className="hero-section">
          <div className="hero-badge">
            <span className="status-dot"></span> 2+ ANOS NO MERCADO
          </div>
          <div className="hero-icon-large">⚡</div>
          <h1 className="hero-title">
            Domine seus jogos.
            <br />
            Ninguém te para.
          </h1>
          <p className="hero-subtitle">
            Painéis que os pros confiam: bypass blindado, updates antes de cada patch e suporte que
            resolve na hora. A referência absoluta da América Latina.
          </p>

          <div className="hero-actions">
            <button className="btn-auth-register" style={{ padding: "0.85rem 2.25rem", fontSize: "0.95rem" }} onClick={() => setViewMode("register")}>
              COMEÇAR AGORA
            </button>
            <a href="#produtos" className="btn-secondary" style={{ padding: "0.85rem 2.25rem" }}>
              Ver Produtos
            </a>
          </div>

          <div style={{ display: "flex", gap: "1.5rem", marginBottom: "2.5rem", fontSize: "0.85rem" }}>
            <span style={{ color: "var(--status-green)", fontWeight: 600 }}>Teste grátis disponível</span>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
              💬 Comunidade Discord
            </a>
          </div>

          <div className="hero-trust-bar">
            <span>🛡️ INDETECTÁVEL</span>
            <span>⚡ UPDATES DIÁRIOS</span>
            <span>🎧 SUPORTE DEDICADO</span>
          </div>
        </section>

        {/* STATS BANNER (Image 2) */}
        <div className="stats-banner">
          <div>
            <div className="stats-item-val">2+</div>
            <div className="stats-item-label">ANOS NO MERCADO</div>
          </div>
          <div>
            <div className="stats-item-val">1000+</div>
            <div className="stats-item-label">CLIENTES SATISFEITOS</div>
          </div>
          <div>
            <div className="stats-item-val">24/7</div>
            <div className="stats-item-label">SUPORTE ATIVO</div>
          </div>
          <div>
            <div className="stats-item-val">99.9%</div>
            <div className="stats-item-label">UPTIME</div>
          </div>
        </div>

        {/* PRODUCTS SHOWCASE SECTION (Image 2) */}
        <section id="produtos" className="landing-section">
          <h2 className="section-title-large">Produtos</h2>
          <p className="section-subtitle">Painéis e ferramentas pros jogos que você joga.</p>

          <div className="showcase-grid">
            {productsList.map((p) => (
              <div key={p.id} className="showcase-card">
                <div>
                  <div className="showcase-img-box">
                    <span>{p.name.toUpperCase()}</span>
                    {p.badge && <span className="product-badge">{p.badge}</span>}
                  </div>

                  <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.25rem", color: "#fff", marginBottom: "0.4rem" }}>
                    {p.name}
                  </h3>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                    {p.category.toUpperCase()}
                  </div>

                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "1rem" }}>
                    {p.description}
                  </p>

                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, color: "var(--primary-cyan)", marginBottom: "1rem" }}>
                    {p.price}
                  </div>

                  <div className="showcase-tags">
                    {p.tags.map((t, idx) => (
                      <span key={idx} className="showcase-tag">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: "1.5rem" }}>
                  <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setViewMode("register")}>
                    ADQUIRIR AGORA
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ ACCORDION SECTION (Image 1) */}
        <section id="faq" className="landing-section">
          <h2 className="section-title-large">FAQ</h2>
          <p className="section-subtitle">Dúvidas comuns antes de começar.</p>

          <div className="faq-list">
            {faqItems.map((item, idx) => (
              <div key={idx} className="faq-item">
                <div className="faq-question" onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}>
                  <span>{item.q}</span>
                  <span style={{ color: "var(--primary-cyan)" }}>{openFaq === idx ? "▲" : "▼"}</span>
                </div>
                {openFaq === idx && <div className="faq-answer">{item.a}</div>}
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Ainda tem dúvidas?{" "}
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" style={{ color: "var(--primary-cyan)", fontWeight: 600 }}>
              Entre em contato.
            </a>
          </div>
        </section>

        {/* BOTTOM CTA BANNER (Image 1) */}
        <div className="cta-banner">
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "2.5rem", color: "#fff", marginBottom: "0.5rem" }}>
            Pronto pra dominar?
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
            Entrega automática via Pix. Instalação remota gratuita. Suporte 24/7.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
            <button className="btn-auth-register" style={{ padding: "0.85rem 2.25rem", fontSize: "0.95rem" }} onClick={() => setViewMode("register")}>
              CRIAR CONTA
            </button>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: "0.85rem 2.25rem" }}>
              💬 Comunidade Discord
            </a>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. SPLIT-SCREEN REGISTER PAGE (Exact match of Image 4)
  // --------------------------------------------------------------------------
  if (viewMode === "register" && !userSession) {
    return (
      <div className="auth-split-container">
        {/* LEFT PANEL */}
        <div className="auth-split-left">
          <div className="hero-icon-large">⚡</div>
          <div className="logo-text" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
            PRIME
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2.5rem" }}>
            A referência absoluta da América Latina
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", textAlign: "left", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "3rem" }}>
            <div>🛡️ INDETECTÁVEL</div>
            <div>⚡ UPDATES DIÁRIOS</div>
            <div>🎧 SUPORTE 24/7</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--status-green)", fontFamily: "var(--font-mono)" }}>
            <span className="status-dot"></span> SISTEMA ONLINE
          </div>
        </div>

        {/* RIGHT PANEL - FORM */}
        <div className="auth-split-right">
          <div className="auth-card-box">
            <h2 style={{ fontFamily: "var(--font-heading)", color: "#fff", marginBottom: "1.5rem", textAlign: "center" }}>
              Crie sua conta
            </h2>

            {authError && (
              <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#ef4444", padding: "0.75rem", borderRadius: "6px", fontSize: "0.8rem", marginBottom: "1rem" }}>
                {authError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label className="form-label">USUÁRIO</label>
                <input type="text" className="form-input" placeholder="Escolha um nome de usuário" value={authUser} onChange={(e) => setAuthUser(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">EMAIL</label>
                <input type="email" className="form-input" placeholder="Digite seu email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">SENHA</label>
                <input type="password" className="form-input" placeholder="Mínimo 8 caracteres" value={authPass} onChange={(e) => setAuthPass(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">CONFIRMAR SENHA</label>
                <input type="password" className="form-input" placeholder="Repita sua senha" value={authConfirmPass} onChange={(e) => setAuthConfirmPass(e.target.value)} required />
              </div>

              {/* SIMULATED CAPTCHA WIDGET (Image 4) */}
              <div className="captcha-widget-box">
                <label className="captcha-checkbox">
                  <input type="checkbox" required defaultChecked />
                  <span>Confirme que é humano</span>
                </label>
                <span style={{ fontSize: "0.65rem", color: "#9ca3af" }}>Cloudflare</span>
              </div>

              <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "0.85rem" }} disabled={loading}>
                {loading ? "CRIANDO CONTA..." : "Criar Conta"}
              </button>
            </form>

            <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Já tem conta?{" "}
              <button style={{ background: "none", border: "none", color: "var(--primary-cyan)", fontWeight: 700, cursor: "pointer" }} onClick={() => setViewMode("login")}>
                Entrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 3. SPLIT-SCREEN LOGIN PAGE (Exact match of Image 5)
  // --------------------------------------------------------------------------
  if (viewMode === "login" && !userSession) {
    return (
      <div className="auth-split-container">
        {/* LEFT PANEL */}
        <div className="auth-split-left">
          <div className="hero-icon-large">⚡</div>
          <div className="logo-text" style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
            PRIME
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "2.5rem" }}>
            A referência absoluta da América Latina
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", textAlign: "left", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "3rem" }}>
            <div>🛡️ INDETECTÁVEL</div>
            <div>⚡ UPDATES DIÁRIOS</div>
            <div>🎧 SUPORTE 24/7</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--status-green)", fontFamily: "var(--font-mono)" }}>
            <span className="status-dot"></span> SISTEMA ONLINE
          </div>
        </div>

        {/* RIGHT PANEL - FORM */}
        <div className="auth-split-right">
          <div className="auth-card-box">
            <h2 style={{ fontFamily: "var(--font-heading)", color: "#fff", marginBottom: "1.5rem", textAlign: "center" }}>
              Acesse sua conta
            </h2>

            {authError && (
              <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#ef4444", padding: "0.75rem", borderRadius: "6px", fontSize: "0.8rem", marginBottom: "1rem" }}>
                {authError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label className="form-label">IDENTIFICADOR</label>
                <input type="text" className="form-input" placeholder="Usuário ou email" value={authUser} onChange={(e) => setAuthUser(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">SENHA</label>
                <input type="password" className="form-input" placeholder="Digite sua senha" value={authPass} onChange={(e) => setAuthPass(e.target.value)} required />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                  <input type="checkbox" defaultChecked /> Lembrar de mim
                </label>
                <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
                  Esqueceu a senha?
                </a>
              </div>

              {/* SIMULATED CAPTCHA WIDGET (Image 5) */}
              <div className="captcha-widget-box">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--status-green)", fontSize: "0.8rem" }}>
                  <span className="status-dot"></span> Verificando...
                </div>
                <span style={{ fontSize: "0.65rem", color: "#9ca3af" }}>Cloudflare</span>
              </div>

              <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "0.85rem" }} disabled={loading}>
                {loading ? "ENTRANDO..." : "Entrar"}
              </button>
            </form>

            <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Não tem conta?{" "}
              <button style={{ background: "none", border: "none", color: "var(--primary-cyan)", fontWeight: 700, cursor: "pointer" }} onClick={() => setViewMode("register")}>
                Criar conta
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 4. LOGGED-IN CLIENT & ADMIN DASHBOARD
  // --------------------------------------------------------------------------
  const isAdminRoute = currentTab.startsWith("admin");
  const userProducts = userSession?.products || [];
  const userInvoices = userSession?.invoices || [];

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-box">
            <div className="logo-icon">⚡</div>
            <div>
              <div className="logo-text">PRIME</div>
              <div className="logo-sub">{isAdminRoute ? "PAINEL ADMIN" : "PAINEL DO CLIENTE"}</div>
            </div>
          </div>
        </div>

        {userSession?.role === "ADMINISTRADOR" || userSession?.role === "ADMIN" ? (
          <div style={{ padding: "0 0.5rem 1rem 0.5rem" }}>
            <button className="btn-secondary" style={{ width: "100%", justifyContent: "center", fontSize: "0.75rem" }} onClick={() => setCurrentTab(isAdminRoute ? "inicio" : "admin-keys")}>
              {isAdminRoute ? "IR P/ PAINEL CLIENTE" : "MODO ADMINISTRADOR"}
            </button>
          </div>
        ) : null}

        {!isAdminRoute ? (
          <>
            <div className="nav-section">
              <div className="nav-section-title">Navegação</div>
              <ul className="nav-list">
                <li><button className={`nav-item-btn ${currentTab === "inicio" ? "active" : ""}`} onClick={() => setCurrentTab("inicio")}>Início</button></li>
                <li><button className={`nav-item-btn ${currentTab === "loja" ? "active" : ""}`} onClick={() => setCurrentTab("loja")}>Loja</button></li>
                <li><button className={`nav-item-btn ${currentTab === "meus-produtos" ? "active" : ""}`} onClick={() => setCurrentTab("meus-produtos")}>Meus Produtos</button></li>
                <li><button className={`nav-item-btn ${currentTab === "downloads" ? "active" : ""}`} onClick={() => setCurrentTab("downloads")}>Downloads</button></li>
                <li><button className="nav-item-btn" onClick={() => setActiveModal("redeem")}>Resgatar Chave</button></li>
                <li><button className={`nav-item-btn ${currentTab === "faturas" ? "active" : ""}`} onClick={() => setCurrentTab("faturas")}>Faturas</button></li>
              </ul>
            </div>

            <div className="nav-section">
              <div className="nav-section-title">Conta</div>
              <ul className="nav-list">
                <li><button className={`nav-item-btn ${currentTab === "perfil" ? "active" : ""}`} onClick={() => setCurrentTab("perfil")}>Perfil</button></li>
              </ul>
            </div>
          </>
        ) : (
          <div className="nav-section">
            <div className="nav-section-title">Administração</div>
            <ul className="nav-list">
              <li><button className={`nav-item-btn ${currentTab === "admin-keys" ? "active" : ""}`} onClick={() => setCurrentTab("admin-keys")}>🔑 Gerador de Keys</button></li>
              <li><button className={`nav-item-btn ${currentTab === "admin-downloads" ? "active" : ""}`} onClick={() => setCurrentTab("admin-downloads")}>📥 Atualizar Download</button></li>
              <li><button className={`nav-item-btn ${currentTab === "admin-ip-release" ? "active" : ""}`} onClick={() => setCurrentTab("admin-ip-release")}>🌐 Liberação de IP</button></li>
              <li><button className={`nav-item-btn ${currentTab === "admin-products" ? "active" : ""}`} onClick={() => setCurrentTab("admin-products")}>Produtos FF</button></li>
              <li><button className={`nav-item-btn ${currentTab === "admin-logs" ? "active" : ""}`} onClick={() => setCurrentTab("admin-logs")}>Activity Logs</button></li>
            </ul>
          </div>

        )}

        <div className="community-box">
          <div className="community-title">Comunidade</div>
          <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="community-link">Discord</a>
          <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="community-link">Suporte</a>
        </div>

        <div className="user-footer">
          <div className="user-info-mini">
            <div className="avatar-mini">{(userSession?.username || "U").charAt(0).toUpperCase()}</div>
            <div>
              <div className="user-name-mini">{userSession?.username}</div>
              <div className="user-role-mini">{userSession?.role || "OPERADOR"}</div>
            </div>
          </div>
          <button className="logout-btn" title="Sair" onClick={handleLogout}>✕</button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        <div className="top-bar">
          <div className="page-title">
            {isAdminRoute ? "Painel Administrativo" : "Painel do Cliente"}
            {userSession?.role === "ADMINISTRADOR" || userSession?.role === "ADMIN" ? <span className="admin-badge">ADMIN</span> : null}
          </div>
          <div>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}>
              Discord Server
            </a>
          </div>
        </div>

        {/* CLIENT INÍCIO (Exact Screenshot 1 Layout) */}
        {currentTab === "inicio" && (
          <>
            <div className="user-banner-card">
              <div className="user-banner-left">
                <div className="banner-role-tag">{userSession?.role || "OPERADOR"}</div>
                <div className="banner-username-row">
                  <span className="banner-username">{userSession?.username}</span>
                  <span className="status-dot"></span>
                </div>
                <div className="banner-subtext">
                  {userProducts.length > 0 ? `${userProducts.length} produto(s) ativo(s) em sua conta` : "sem produtos ativos — visite a loja +"}
                </div>
                <div className="banner-actions">
                  <button className="btn-primary" onClick={() => setActiveModal("redeem")}>RESGATAR CHAVE</button>
                  <button className="btn-secondary" onClick={() => setCurrentTab("loja")}>IR PARA LOJA</button>
                </div>
              </div>
              <div className="user-banner-right">
                <div className="stat-counter-box">
                  <div className="stat-counter-label">PRODUTOS</div>
                  <div className="stat-counter-val">{userProducts.length}</div>
                </div>
                <div className="stat-counter-box">
                  <div className="stat-counter-label">FATURAS</div>
                  <div className="stat-counter-val">{userInvoices.length}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="section-header-row">
                <div className="section-header-title">MEUS PRODUTOS</div>
                <a href="#" className="section-header-link" onClick={(e) => { e.preventDefault(); setCurrentTab("meus-produtos"); }}>VER TODOS +</a>
              </div>

              {userProducts.length === 0 ? (
                <div className="empty-state-box">
                  <div className="empty-state-text">// NENHUM PRODUTO ATIVO</div>
                  <div className="empty-state-actions">
                    <button className="btn-primary" style={{ fontSize: "0.75rem" }} onClick={() => setCurrentTab("loja")}>LOJA</button>
                    <button className="btn-secondary" style={{ fontSize: "0.75rem" }} onClick={() => setActiveModal("redeem")}>RESGATAR</button>
                  </div>
                </div>
              ) : (
                <div className="products-grid">
                  {userProducts.map((p, idx) => (
                    <div key={idx} className="product-card">
                      <div className="product-badge">ATIVO</div>
                      <div className="product-name">{p.productName}</div>
                      <div className="product-desc">Chave: <code>{p.keyCode}</code></div>
                      <a href={p.downloadUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}>
                        DOWNLOAD SOFTWARE
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="section-header-row">
                <div className="section-header-title">FATURAS RECENTES</div>
                <a href="#" className="section-header-link" onClick={(e) => { e.preventDefault(); setCurrentTab("faturas"); }}>VER TODAS +</a>
              </div>

              {userInvoices.length === 0 ? (
                <div className="empty-state-box">
                  <div className="empty-state-text">// SEM FATURAS</div>
                  <div className="empty-state-actions">
                    <button className="btn-primary" style={{ fontSize: "0.75rem" }} onClick={() => setCurrentTab("loja")}>IR PARA LOJA</button>
                  </div>
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr><th>CÓDIGO FATURA</th><th>PRODUTO</th><th>CHAVE RESGATADA</th><th>DATA</th><th>STATUS</th></tr>
                    </thead>
                    <tbody>
                      {userInvoices.map((inv, idx) => (
                        <tr key={idx}>
                          <td>#{inv.id}</td>
                          <td>{inv.productName}</td>
                          <td><code>{inv.keyCode}</code></td>
                          <td>{inv.date}</td>
                          <td><span className="status-badge status-active">CONCLUÍDO</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* CLIENT PERFIL (Exact Screenshot 2 Layout) */}
        {currentTab === "perfil" && (
          <>
            <div className="profile-header-card">
              <div className="profile-avatar-large">{(userSession?.username || "U").charAt(0).toUpperCase()}</div>
              <div className="profile-info-text">
                <div className="name">{userSession?.username}</div>
                <div className="email">{userSession?.email}</div>
              </div>
            </div>

            <div className="profile-grid">
              <div>
                <div className="card">
                  <div className="section-header-row"><div className="section-header-title">INFORMAÇÕES</div></div>
                  <form onSubmit={handleProfileSave}>
                    <div className="form-group">
                      <label className="form-label">USUÁRIO</label>
                      <input type="text" className="form-input" value={profUser} onChange={(e) => setProfUser(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">EMAIL</label>
                      <input type="email" className="form-input" value={profEmail} onChange={(e) => setProfEmail(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn-primary">SALVAR</button>
                  </form>
                </div>

                <div className="card">
                  <div className="section-header-row"><div className="section-header-title">ALTERAR SENHA</div></div>
                  <form onSubmit={handlePasswordSave}>
                    <div className="form-group">
                      <label className="form-label">SENHA ATUAL</label>
                      <input type="password" className="form-input" value={passCurrent} onChange={(e) => setPassCurrent(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">NOVA SENHA</label>
                      <input type="password" className="form-input" value={passNew} onChange={(e) => setPassNew(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CONFIRMAR NOVA SENHA</label>
                      <input type="password" className="form-input" value={passConfirm} onChange={(e) => setPassConfirm(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn-primary">ALTERAR SENHA</button>
                  </form>
                </div>
              </div>

              <div>
                <div className="card">
                  <div className="section-header-row"><div className="section-header-title">DISPOSITIVOS</div></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>RESETS GRÁTIS</span>
                    <span style={{ fontWeight: 700, color: "var(--status-green)" }}>
                      {(userSession?.hwidResetsMax || 2) - (userSession?.hwidResetsUsed || 0)} / {userSession?.hwidResetsMax || 2} por mês
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                    {userProducts.length === 0 ? "NENHUM PRODUTO VINCULADO" : `${userProducts.length} PRODUTO(S) VINCULADO(S)`}
                  </div>
                  <div className="notice-box">
                    <div className="notice-title">INFORMAÇÕES</div>
                    <ul className="notice-list">
                      <li>Cada produto tem seu próprio HWID</li>
                      <li>Resetar desvincula apenas o produto selecionado</li>
                      <li>Execute o software no novo PC para vincular</li>
                      <li>2 resets grátis por mês + extras comprados</li>
                    </ul>
                  </div>
                  <button className="btn-secondary" style={{ width: "100%", justifyContent: "center", marginBottom: "0.5rem" }} onClick={handleHWIDReset}>
                    EXECUTAR RESET DE HWID
                  </button>
                  <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                    COMPRAR RESET EXTRA VIA DISCORD
                  </a>
                </div>

                <div className="card">
                  <div className="section-header-row"><div className="section-header-title">CONTA</div></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>MEMBRO DESDE</span>
                    <span style={{ fontSize: "0.8rem", color: "#fff" }}>{userSession?.createdAt || "10/08/2026"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>EMAIL VERIFICADO</span>
                    <span className="badge-green" style={{ fontSize: "0.8rem" }}>Sim</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* STORE PAGE */}
        {currentTab === "loja" && (
          <div className="card">
            <div className="section-header-row"><div className="section-header-title">LOJA DE PRODUTOS FREE FIRE</div></div>
            <div className="products-grid">
              {productsList.map((p) => (
                <div key={p.id} className="product-card">
                  <div className="product-badge">{p.category}</div>
                  <div className="product-name">{p.name}</div>
                  <div className="product-desc">{p.description}</div>
                  <div className="product-price">{p.price}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className="btn-primary" style={{ justifyContent: "center" }}>
                      COMPRAR VIA DISCORD
                    </a>
                    <button className="btn-secondary" style={{ justifyContent: "center" }} onClick={() => setActiveModal("redeem")}>
                      JÁ POSSUO CHAVE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MEUS PRODUTOS PAGE */}
        {currentTab === "meus-produtos" && (
          <div className="card">
            <div className="section-header-row"><div className="section-header-title">MEUS PRODUTOS RESGATADOS</div></div>
            {userProducts.length === 0 ? (
              <div className="empty-state-box">
                <div className="empty-state-text">// VOCÊ AINDA NÃO RESGATOU NENHUM PRODUTO</div>
                <button className="btn-primary" onClick={() => setActiveModal("redeem")}>RESGATAR CHAVE AGORA</button>
              </div>
            ) : (
              <div className="products-grid">
                {userProducts.map((p, idx) => (
                  <div key={idx} className="product-card">
                    <div className="product-badge">RESGATADO</div>
                    <div className="product-name">{p.productName}</div>
                    <div className="product-desc">Chave: <code>{p.keyCode}</code></div>
                    <a href={p.downloadUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ justifyContent: "center" }}>
                      DOWNLOAD SOFTWARE
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DOWNLOADS PAGE */}
        {currentTab === "downloads" && (
          <div className="card">
            <div className="section-header-row"><div className="section-header-title">CENTRAL DE DOWNLOADS</div></div>
            {userProducts.length === 0 ? (
              <div className="empty-state-box">
                <div className="empty-state-text">// RESGATE UMA CHAVE PARA LIBERAR DOWNLOADS</div>
                <button className="btn-primary" onClick={() => setActiveModal("redeem")}>RESGATAR CHAVE</button>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr><th>SOFTWARE</th><th>CHAVE VINCULADA</th><th>DATA RESGATE</th><th>AÇÃO</th></tr>
                  </thead>
                  <tbody>
                    {userProducts.map((p, idx) => (
                      <tr key={idx}>
                        <td><strong>{p.productName}</strong></td>
                        <td><code>{p.keyCode}</code></td>
                        <td>{p.redeemedAt}</td>
                        <td>
                          <a href={primeMenuDownloadUrl || p.downloadUrl} target="_blank" rel="noreferrer" className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}>
                            BAIXAR EXE / LOADER
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}


        {/* FATURAS PAGE */}
        {currentTab === "faturas" && (
          <div className="card">
            <div className="section-header-row"><div className="section-header-title">FATURAS E RESGATES</div></div>
            {userInvoices.length === 0 ? (
              <div className="empty-state-box"><div className="empty-state-text">// NENHUMA FATURA ENCONTRADA</div></div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr><th>ID FATURA</th><th>PRODUTO</th><th>CHAVE</th><th>DATA</th><th>STATUS</th></tr>
                  </thead>
                  <tbody>
                    {userInvoices.map((inv, idx) => (
                      <tr key={idx}>
                        <td>#{inv.id}</td>
                        <td>{inv.productName}</td>
                        <td><code>{inv.keyCode}</code></td>
                        <td>{inv.date}</td>
                        <td><span className="status-badge status-active">CONCLUÍDO</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ADMIN KEYS PAGE */}
        {currentTab === "admin-keys" && (
          <div className="card">
            <div className="section-header-row">
              <div className="section-header-title">GERADOR E GESTÃO DE KEYS — PRIME MENU FREE FIRE</div>
              <button className="btn-primary" onClick={() => setActiveModal("create-key")}>⚡ GERAR KEYS EM MASSA</button>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>CÓDIGO DA KEY</th>
                    <th>PRODUTO</th>
                    <th>DURAÇÃO</th>
                    <th>STATUS</th>
                    <th>RESGATADO POR</th>
                    <th>CONTROLES / AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {keysList.map((k, idx) => {
                    let statusLabel = "DISPONÍVEL";
                    let statusClass = "status-active";
                    if (k.banned) {
                      statusLabel = "BANIDA";
                      statusClass = "btn-danger";
                    } else if (k.paused) {
                      statusLabel = "PAUSADA";
                      statusClass = "status-used";
                    } else if (k.status === "USED" || k.redeemedBy) {
                      statusLabel = "RESGATADA";
                      statusClass = "status-used";
                    }

                    return (
                      <tr key={idx}>
                        <td><strong style={{ color: "var(--primary-cyan)" }}>{k.code}</strong></td>
                        <td>{k.productName || "PRIME MENU FREE FIRE"}</td>
                        <td>{k.durationDays === 9999 ? "Permanente" : k.durationDays + " Dias"}</td>
                        <td><span className={`status-badge ${statusClass}`}>{statusLabel}</span></td>
                        <td>{k.redeemedBy || "-"}</td>
                        <td style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                          <button className="btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem" }} onClick={() => copyText(k.code)}>
                            COPIAR
                          </button>
                          <button className="btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem", color: k.paused ? "var(--status-green)" : "var(--status-amber)" }} onClick={() => handlePauseKey(k.code, k.paused)}>
                            {k.paused ? "▶️ ATIVAR" : "⏸️ PAUSAR"}
                          </button>
                          <button className="btn-danger" style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem" }} onClick={() => handleBanKey(k.code, k.banned)}>
                            {k.banned ? "DESBANIR" : "BANIR"}
                          </button>
                          <button className="btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem" }} onClick={() => handleResetKeyHWID(k.code)}>
                            RESET HWID
                          </button>
                          <button className="btn-danger" style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem" }} onClick={() => handleDeleteKey(k.code)}>
                            DELETAR
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {/* ADMIN PRODUCTS PAGE */}
        {currentTab === "admin-products" && (
          <div className="card">
            <div className="section-header-row">
              <div className="section-header-title">PRODUTOS FREE FIRE</div>
              <button className="btn-primary" onClick={() => setActiveModal("create-product")}>ADICIONAR PRODUTO</button>
            </div>
            <div className="products-grid">
              {productsList.map((p) => (
                <div key={p.id} className="product-card">
                  <div className="product-name">{p.name}</div>
                  <div className="product-desc">{p.description}</div>
                  <div className="product-price">{p.price}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADMIN DOWNLOADS PAGE */}
        {currentTab === "admin-downloads" && (

          <div className="card">
            <div className="section-header-row">
              <div className="section-header-title">ATUALIZAR LINK DE DOWNLOAD DO PRIME MENU FREE FIRE</div>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              Altere o link oficial de download (.EXE / Loader / Pasta) do PRIME MENU FREE FIRE para todos os clientes ativos no painel.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              showToast("Link de download atualizado para os clientes com sucesso!");
            }}>
              <div className="form-group">
                <label className="form-label">LINK ATUAL DE DOWNLOAD</label>
                <input
                  type="text"
                  className="form-input"
                  value={primeMenuDownloadUrl}
                  onChange={(e) => setPrimeMenuDownloadUrl(e.target.value)}
                  placeholder="https://..."
                  required
                />
              </div>
              <button type="submit" className="btn-primary">
                SALVAR E PUBLICAR NOVO LINK
              </button>
            </form>
          </div>
        )}

        {/* ADMIN IP RELEASE PAGE (Painel Remoto Celular :5000) */}
        {currentTab === "admin-ip-release" && (
          <div className="card">
            <div className="section-header-row">
              <div className="section-header-title">LIBERAÇÃO DE IP — PAINEL REMOTO NO CELULAR (:5000)</div>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              Insira o IP do computador do cliente para gerar o link de acesso remoto pelo celular (ex: <code>http://192.168.18.6:5000/</code>) para o painel em <code>C:\Users\adrye\Music\PHANTON MENU teste\vazado v2 teste</code>.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!ipReleaseInput.trim()) return;
              const cleanIp = ipReleaseInput.trim().replace(/^http:\/\//i, "").replace(/:5000\/?$/i, "");
              const generatedLink = `http://${cleanIp}:5000/`;
              const newEntry = {
                ip: cleanIp,
                client: ipClientName || "Cliente PRIME",
                link: generatedLink,
                date: new Date().toLocaleDateString("pt-BR"),
              };
              setReleasedIps((prev) => [newEntry, ...prev]);
              setIpReleaseInput("");
              setIpClientName("");
              showToast(`IP ${cleanIp} liberado! Link: ${generatedLink}`);
            }} style={{ marginBottom: "2rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label className="form-label">NOME / USUÁRIO DO CLIENTE</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: João Silva"
                    value={ipClientName}
                    onChange={(e) => setIpClientName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ENDEREÇO IP DO COMPUTADOR</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: 192.168.18.6"
                    value={ipReleaseInput}
                    onChange={(e) => setIpReleaseInput(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary">
                🌐 GERAR LINK DE ACESSO REMOTO CELL
              </button>
            </form>

            <div className="section-header-row">
              <div className="section-header-title">IPS LIBERADOS PARA PAINEL REMOTO</div>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>CLIENTE</th>
                    <th>ENDEREÇO IP</th>
                    <th>LINK DE ACESSO NO CELULAR</th>
                    <th>DATA LIBERAÇÃO</th>
                    <th>AÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {releasedIps.map((item, idx) => (
                    <tr key={idx}>
                      <td><strong>{item.client}</strong></td>
                      <td><code>{item.ip}</code></td>
                      <td><a href={item.link} target="_blank" rel="noreferrer" style={{ color: "var(--primary-cyan)", textDecoration: "none", fontWeight: 700 }}>{item.link}</a></td>
                      <td>{item.date}</td>
                      <td>
                        <button className="btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem" }} onClick={() => copyText(item.link)}>
                          COPIAR LINK
                        </button>
                        <button className="btn-danger" style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem", marginLeft: "0.3rem" }} onClick={() => setReleasedIps((prev) => prev.filter((_, i) => i !== idx))}>
                          REMOVER
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ADMIN LOGS PAGE */}
        {currentTab === "admin-logs" && (

          <div className="card">
            <div className="section-header-row">
              <div className="section-header-title">LOGS DO SISTEMA EM TEMPO REAL</div>
            </div>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr><th>TIMESTAMP</th><th>TIPO</th><th>DETALHE DA ATIVIDADE</th></tr>
                </thead>
                <tbody>
                  {logsList.map((l, idx) => (
                    <tr key={idx}>
                      <td style={{ color: "var(--text-muted)" }}>{l.timestamp}</td>
                      <td><span className="status-badge status-active">{l.type}</span></td>
                      <td>{l.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>


      {/* MODALS */}
      {activeModal === "redeem" && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button className="modal-close-btn" onClick={() => setActiveModal(null)}>&times;</button>
            <h3 style={{ color: "#fff", marginBottom: "1rem" }}>RESGATAR CHAVE PRIME</h3>
            <form onSubmit={handleRedeemSubmit}>
              <div className="form-group">
                <label className="form-label">CÓDIGO DA KEY</label>
                <input type="text" className="form-input" placeholder="PRIME-XXXX-XXXX" value={redeemCodeInput} onChange={(e) => setRedeemCodeInput(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
                {loading ? "ATIVANDO..." : "ATIVAR PRODUTO"}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeModal === "create-key" && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 500 }}>
            <button className="modal-close-btn" onClick={() => { setActiveModal(null); setBatchKeysResult(null); }}>&times;</button>
            <h3 style={{ color: "#fff", marginBottom: "1rem" }}>GERADOR DE KEYS — PRIME MENU FREE FIRE</h3>

            {batchKeysResult ? (
              <div>
                <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "var(--status-green)", padding: "0.75rem", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "1rem" }}>
                  ✅ {batchKeysResult.length} chave(s) gerada(s) com sucesso!
                </div>

                <div className="form-group">
                  <label className="form-label">CHAVES GERADAS</label>
                  <textarea className="form-input" style={{ height: "140px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", resize: "none" }} readOnly value={batchKeysResult.join("\n")} />
                </div>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => downloadTxt(batchKeysResult)}>
                    📥 BAIXAR CHAVES EM ARQUIVO .TXT
                  </button>
                  <button className="btn-secondary" onClick={() => setBatchKeysResult(null)}>
                    GERAR MAIS
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                const daysNum = genDays ? parseInt(genDays) : null;
                const hoursNum = daysNum ? daysNum * 24 : null;
                const countNum = Math.min(Math.max(parseInt(genAmount) || 1, 1), 500);

                try {
                  const res = await fetch("/api/generate-key", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      adminSecret: "adryel1104",
                      productName: genProduct,
                      prefix: genProduct === "PRIME EXTREMER" ? "EXTREMER" : "PRIME",
                      note: genProduct,
                      expiresInHours: hoursNum,
                      amount: countNum,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Erro ao gerar chaves");

                  const generatedCodes = data.codes || [data.key?.key];
                  const newRecords = generatedCodes.map((c) => ({
                    code: c,
                    productName: genProduct,
                    durationDays: daysNum || 9999,
                    status: "UNUSED",
                    redeemedBy: null,
                    banned: false,
                    paused: false,
                  }));

                  setKeysList((prev) => {
                    const updated = [...newRecords, ...prev];
                    saveStorage("prime_keys_list", updated);
                    return updated;
                  });
                  setBatchKeysResult(generatedCodes);

                  if (generatedCodes.length >= 5) {
                    downloadTxt(generatedCodes);
                  }
                  showToast(`${generatedCodes.length} key(s) gerada(s) para ${genProduct}!`);
                } catch (err) {
                  const localCodes = [];
                  const prefixStr = genProduct === "PRIME EXTREMER" ? "EXTREMER" : "PRIME";
                  for (let i = 0; i < countNum; i++) {
                    const tag = Math.random().toString(36).substring(2, 8).toUpperCase();
                    localCodes.push(`${prefixStr}-${tag}`);
                  }
                  const newRecords = localCodes.map((c) => ({
                    code: c,
                    productName: genProduct,
                    durationDays: daysNum || 9999,
                    status: "UNUSED",
                    redeemedBy: null,
                    banned: false,
                    paused: false,
                  }));

                  setKeysList((prev) => {
                    const updated = [...newRecords, ...prev];
                    saveStorage("prime_keys_list", updated);
                    return updated;
                  });
                  setBatchKeysResult(localCodes);

                  if (localCodes.length >= 5) {
                    downloadTxt(localCodes);
                  }
                  showToast(`${localCodes.length} key(s) gerada(s) localmente!`);
                } finally {
                  setLoading(false);
                }
              }}>
                <div className="form-group">
                  <label className="form-label">SELECIONAR PRODUTO</label>
                  <select className="form-input" value={genProduct} onChange={(e) => setGenProduct(e.target.value)}>
                    <option value="PRIME EXTREMER">⭐ PRIME EXTREMER (Painel Novo)</option>
                    <option value="PRIME MENU FREE FIRE">🔥 PRIME MENU FREE FIRE</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">PRESET RÁPIDO DE DURAÇÃO</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
                    <button type="button" className={`btn-secondary ${genDays === 1 ? "active" : ""}`} style={{ fontSize: "0.8rem", padding: "0.4rem" }} onClick={() => setGenDays(1)}>1 Dia</button>
                    <button type="button" className={`btn-secondary ${genDays === 7 ? "active" : ""}`} style={{ fontSize: "0.8rem", padding: "0.4rem" }} onClick={() => setGenDays(7)}>7 Dias</button>
                    <button type="button" className={`btn-secondary ${genDays === 30 ? "active" : ""}`} style={{ fontSize: "0.8rem", padding: "0.4rem" }} onClick={() => setGenDays(30)}>30 Dias</button>
                    <button type="button" className={`btn-secondary ${genDays === "" ? "active" : ""}`} style={{ fontSize: "0.8rem", padding: "0.4rem" }} onClick={() => setGenDays("")}>Vitalícia</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">QUANTIDADE DE KEYS A GERAR</label>
                  <input type="number" className="form-input" placeholder="Ex: 1, 5, 10, 50, 100" min="1" max="500" value={genAmount} onChange={(e) => setGenAmount(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">DURAÇÃO PERSONALIZADA (DIAS)</label>
                  <input type="number" className="form-input" placeholder="Ex: 30 (Vazio = Permanente)" value={genDays} onChange={(e) => setGenDays(e.target.value)} />
                </div>
                <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
                  {loading ? "GERANDO CHAVES..." : `GERAR ${genAmount > 1 ? `${genAmount} KEYS` : "KEY"}`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}


      {activeModal === "create-product" && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button className="modal-close-btn" onClick={() => setActiveModal(null)}>&times;</button>
            <h3 style={{ color: "#fff", marginBottom: "1rem" }}>ADICIONAR PRODUTO</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const newProd = {
                id: "p-" + Date.now(),
                name: newProdName || "PRIME MENU FREE FIRE",
                category: "Free Fire",
                price: newProdPrice || "COMPRAR VIA DISCORD",
                description: newProdDesc || "Painel completo Free Fire",
                tags: ["BYPASS", "AIMBOT", "ESP"],
                downloadUrl: newProdUrl || "https://discord.gg/RHwSMM6azb",
              };
              setProductsList((prev) => [...prev, newProd]);
              setNewProdName("");
              setNewProdPrice("");
              setNewProdUrl("");
              setNewProdDesc("");
              setActiveModal(null);
              showToast("Produto adicionado com sucesso!");
            }}>
              <div className="form-group">
                <label className="form-label">NOME DO PRODUTO</label>
                <input type="text" className="form-input" placeholder="PRIME MENU FREE FIRE" value={newProdName} onChange={(e) => setNewProdName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">DESCRIÇÃO</label>
                <input type="text" className="form-input" placeholder="Recursos do produto" value={newProdDesc} onChange={(e) => setNewProdDesc(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">LINK DISCORD / DOWNLOAD</label>
                <input type="text" className="form-input" placeholder="https://discord.gg/RHwSMM6azb" value={newProdUrl} onChange={(e) => setNewProdUrl(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>CADASTRAR PRODUTO</button>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className="toast">{toast}</div>
        </div>
      )}
    </div>
  );
}


