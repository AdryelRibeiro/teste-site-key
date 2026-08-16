using System;
using System.Threading.Tasks;
using SeuProjeto.Licensing;

// Exemplo simples de como usar em um app console ou como ponto de partida
// para colar dentro do form/tela de ativacao do seu projeto WinForms/WPF.

class Program
{
    static async Task Main()
    {
        // troque pela URL real do seu painel depois do deploy na Vercel
        var licenseClient = new LicenseClient("https://seu-projeto.vercel.app");

        Console.Write("Digite sua chave de licenca: ");
        string key = Console.ReadLine();

        Console.WriteLine("Validando...");
        var result = await licenseClient.ValidateAsync(key);

        if (result.Valid)
        {
            Console.WriteLine("Licenca valida! Liberando o programa...");
            Console.WriteLine($"Ativacoes usadas: {result.ActivationsUsed}/{result.MaxActivations}");
            if (result.ExpiresAt.HasValue)
                Console.WriteLine($"Expira em: {result.ExpiresAt:dd/MM/yyyy}");

            // >>> aqui voce chama o restante do seu programa <<<
        }
        else
        {
            Console.WriteLine($"Licenca invalida: {result.Reason}");
            Environment.Exit(1);
        }
    }
}
