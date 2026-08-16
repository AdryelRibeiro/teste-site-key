using System;
using System.Management; // requer referencia ao System.Management (NuGet: System.Management)
using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace SeuProjeto.Licensing
{
    /// <summary>
    /// Resultado da validacao de uma chave de licenca.
    /// </summary>
    public class LicenseValidationResult
    {
        public bool Valid { get; set; }
        public string Reason { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public int ActivationsUsed { get; set; }
        public int MaxActivations { get; set; }
    }

    /// <summary>
    /// Cliente para validar chaves de licenca contra o painel hospedado na Vercel.
    /// </summary>
    public class LicenseClient
    {
        private readonly HttpClient _http;
        private readonly string _baseUrl;

        /// <param name="baseUrl">
        /// URL do seu painel, ex: "https://seu-projeto.vercel.app"
        /// (sem barra no final)
        /// </param>
        public LicenseClient(string baseUrl)
        {
            _baseUrl = baseUrl.TrimEnd('/');
            _http = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(10)
            };
        }

        /// <summary>
        /// Gera um identificador unico e estavel para esta maquina (baseado no
        /// UUID da placa-mae), usado para limitar quantos PCs podem usar a
        /// mesma chave.
        /// </summary>
        public static string GetHardwareId()
        {
            string raw = "fallback";
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT UUID FROM Win32_ComputerSystemProduct");
                foreach (var obj in searcher.Get())
                {
                    raw = obj["UUID"]?.ToString() ?? raw;
                    break;
                }
            }
            catch
            {
                // se falhar (ex: rodando fora do Windows ou sem permissao),
                // usa o nome da maquina como alternativa
                raw = Environment.MachineName;
            }

            using var sha = SHA256.Create();
            var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(raw));
            return Convert.ToHexString(hash)[..32]; // 32 caracteres, suficiente
        }

        /// <summary>
        /// Valida a chave informada contra o servidor. Faz chamada de rede,
        /// entao use com await/async e trate exceptions de rede no chamador.
        /// </summary>
        public async Task<LicenseValidationResult> ValidateAsync(string licenseKey)
        {
            var hwid = GetHardwareId();

            try
            {
                var response = await _http.PostAsJsonAsync($"{_baseUrl}/api/validate-key", new
                {
                    key = licenseKey.Trim(),
                    hwid
                });

                var data = await response.Content.ReadFromJsonAsync<LicenseValidationResult>();
                return data ?? new LicenseValidationResult { Valid = false, Reason = "resposta invalida do servidor" };
            }
            catch (Exception ex)
            {
                // sem internet, servidor fora do ar, etc.
                return new LicenseValidationResult
                {
                    Valid = false,
                    Reason = $"nao foi possivel conectar ao servidor de licencas: {ex.Message}"
                };
            }
        }
    }
}
